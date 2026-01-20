import { retry, schemaTask } from "@trigger.dev/sdk";

import {
  sendEmail,
  WebhookDisabledEmail,
  WebhookFailedEmail,
} from "@agentset/emails";
import { recordWebhookEvent } from "@agentset/tinybird";
import {
  createWebhookSignature,
  disableWebhook,
  getOrganizationOwner,
  handleWebhookFailure,
  resetWebhookFailureCount,
  WEBHOOK_FAILURE_DISABLE_THRESHOLD,
} from "@agentset/webhooks";

import { getDb } from "../db";
import { SEND_WEBHOOK_JOB_ID, sendWebhookBodySchema } from "../schema";

const MAX_RETRY_ATTEMPTS = 10;

export const sendWebhookTask = schemaTask({
  id: SEND_WEBHOOK_JOB_ID,
  schema: sendWebhookBodySchema,
  queue: {
    concurrencyLimit: 100,
  },
  run: async ({ webhookId, eventId, event, url, secret, payload }, { ctx }) => {
    const db = getDb();
    const taskId = ctx.run.id;

    // Create signature
    const signature = await createWebhookSignature(secret, payload);

    let httpStatus: number;
    let isFailure: boolean;
    let responseBody: string;

    try {
      const response = await retry.fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Agentset-Signature": signature,
          "User-Agent": "Agentset-Webhook/1.0",
        },
        body: JSON.stringify(payload),
        timeoutInMs: 20_000, // 20 second timeout
        retry: {
          byStatus: {
            "300-599": {
              strategy: "backoff",
              maxAttempts: MAX_RETRY_ATTEMPTS,
              // Exponential backoff factor: 12
              // Example: 12s, 2m24s, 30m8s, 6h7m6s, 12h14m12s, 24h, ...
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

    // if the webhook was successful, we reset the failure count and return
    if (!isFailure) {
      await resetWebhookFailureCount({ db, webhookId });
      return { success: true, status: httpStatus, response: responseBody };
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
  },
});
