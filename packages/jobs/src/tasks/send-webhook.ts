import { logger, retry, schemaTask } from "@trigger.dev/sdk";

import {
  sendEmail,
  WebhookDisabledEmail,
  WebhookFailedEmail,
} from "@agentset/emails";
import { isTinybirdEnabled, recordWebhookEvent } from "@agentset/tinybird";
import { isEuRegion } from "@agentset/utils";
import {
  createWebhookSignature,
  WEBHOOK_FAILURE_DISABLE_THRESHOLD,
} from "@agentset/webhooks";
import { getWebhookEventPayload } from "@agentset/webhooks/event-store";
import {
  disableWebhook,
  getOrganizationOwner,
  handleWebhookFailure,
  resetWebhookFailureCount,
} from "@agentset/webhooks/server";

import { getDb } from "../db";
import { sanitizeRunErrors } from "../errors";
import { SEND_WEBHOOK_JOB_ID, sendWebhookBodySchema } from "../schema";
import {
  fetchWebhookWithRetry,
  resolveWebhookDelivery,
} from "../webhook-delivery";

const MAX_RETRY_ATTEMPTS = 10;

export const sendWebhookTask = schemaTask({
  id: SEND_WEBHOOK_JOB_ID,
  schema: sendWebhookBodySchema,
  queue: {
    concurrencyLimit: 100,
  },
  run: sanitizeRunErrors(async (body, { ctx }) => {
    const db = getDb();
    const taskId = ctx.run.id;

    const { webhookId, eventId, event, url, secret, payload } =
      await resolveWebhookDelivery(body, {
        getWebhook: (id) =>
          db.webhook.findUnique({
            where: { id },
            select: { url: true, secret: true },
          }),
        getEventPayload: getWebhookEventPayload,
      });

    // Create signature
    const signature = await createWebhookSignature(secret, payload);

    let httpStatus: number;
    let isFailure: boolean;
    let responseBody: string;

    try {
      const request = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Agentset-Signature": signature,
          "User-Agent": "Agentset-Webhook/1.0",
        },
        body: JSON.stringify(payload),
      };

      const response = isEuRegion
        ? await fetchWebhookWithRetry(url, request)
        : await retry.fetch(url, {
            ...request,
            timeoutInMs: 20_000, // 20 second timeout
            retry: {
              byStatus: {
                "300-599": {
                  strategy: "backoff",
                  maxAttempts: MAX_RETRY_ATTEMPTS,
                  // Exponential backoff factor: 12
                  // Example: 12s, 2m24s, 28m48s, 5h45m36s, 24h, ...
                  factor: 12,
                  minTimeoutInMs: 12_000, // 12 second minimum
                  maxTimeoutInMs: 86_400_000, // 24 hour cap
                  randomize: false,
                },
              },
            },
          });

      httpStatus = response.status;
      isFailure = httpStatus >= 400;
      responseBody = await response.text();
    } catch {
      httpStatus = 503;
      isFailure = true;
      responseBody = "";
    }

    // after we finish retrying, we record the event to Tinybird
    if (isTinybirdEnabled) {
      try {
        await recordWebhookEvent({
          event_id: eventId,
          webhook_id: webhookId,
          task_id: taskId,
          event: event,
          url,
          http_status: httpStatus,
          request_body: JSON.stringify(payload),
          response_body: responseBody,
        });
      } catch (error) {
        // the webhook was already delivered: failing here would retry the
        // run and deliver it again
        logger.error("Failed to record webhook event", {
          webhookId,
          eventId,
          error,
        });
      }
    }

    // if the webhook was successful, we reset the failure count and return
    if (!isFailure) {
      await resetWebhookFailureCount({ db, webhookId });
      return {
        success: true,
        status: httpStatus,
        // EU: keep the endpoint's response out of the run output
        ...(!isEuRegion && { response: responseBody }),
      };
    }

    // Handle failure (increments count, determines if notification/disable needed)
    const { webhook, shouldNotify, shouldDisable, wasDisabled } =
      await handleWebhookFailure({ db, webhookId });

    // Skip notifications if already disabled
    if (wasDisabled)
      return {
        success: false,
        status: 503,
        response: "Webhook has been disabled",
      };

    const owner = await getOrganizationOwner({
      db,
      organizationId: webhook.organizationId,
    });

    // Send notification email at thresholds (5, 10, 15)
    if (shouldNotify && owner) {
      await sendEmail({
        email: owner.email,
        subject: "Webhook is failing to deliver",
        react: WebhookFailedEmail({
          email: owner.email,
          organization: owner.organization,
          webhook: {
            id: webhook.id,
            url: webhook.url,
            consecutiveFailures: webhook.consecutiveFailures,
            disableThreshold: WEBHOOK_FAILURE_DISABLE_THRESHOLD,
          },
        }),
      });
    }

    // Disable webhook if threshold reached
    if (shouldDisable) {
      await disableWebhook({
        db,
        webhookId,
        organizationId: webhook.organizationId,
      });

      if (owner) {
        await sendEmail({
          email: owner.email,
          subject: "Webhook has been disabled",
          react: WebhookDisabledEmail({
            email: owner.email,
            organization: owner.organization,
            webhook: {
              id: webhook.id,
              url: webhook.url,
              disableThreshold: WEBHOOK_FAILURE_DISABLE_THRESHOLD,
            },
          }),
        });
      }
    }
  }),
});
