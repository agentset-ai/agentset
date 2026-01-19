import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod/v4";

import {
  sendEmail,
  WebhookDisabledEmail,
  WebhookFailedEmail,
} from "@agentset/emails";
import { recordWebhookEvent, webhookEventSchemaTB } from "@agentset/tinybird";
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

const MAX_RETRY_ATTEMPTS = 5;

// Retry delays aligned with Dub's webhook retry schedule
const RETRY_DELAYS_MS = [
  12_000, // 1st: 12s
  148_000, // 2nd: 2m 28s
  1_808_000, // 3rd: 30m 8s
  22_026_000, // 4th: 6h 7m 6s
  86_400_000, // 5th+: 24h (capped)
] as const;

export const sendWebhookTask = schemaTask({
  id: SEND_WEBHOOK_JOB_ID,
  retry: {
    maxAttempts: MAX_RETRY_ATTEMPTS,
  },
  catchError: async ({ ctx }) => {
    // On last attempt, don't override - let it fail naturally
    if (ctx.attempt.number >= MAX_RETRY_ATTEMPTS) {
      return;
    }

    // Use Dub's exponential backoff schedule, capped at 24h
    const delayIndex = ctx.attempt.number - 1;
    const delay =
      RETRY_DELAYS_MS[Math.min(delayIndex, RETRY_DELAYS_MS.length - 1)]!;

    return { retryAt: new Date(Date.now() + delay) };
  },
  schema: sendWebhookBodySchema,
  run: async ({ webhookId, eventId, event, url, secret, payload }, { ctx }) => {
    const db = getDb();
    const taskId = ctx.run.id;
    const attemptNumber = ctx.attempt.number;
    const isFinalAttempt = attemptNumber >= MAX_RETRY_ATTEMPTS;

    // Create signature
    const signature = await createWebhookSignature(secret, payload);

    let httpStatus = 0;
    let responseBody = "";

    try {
      // Send HTTP POST to webhook URL
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Agentset-Signature": signature,
          "User-Agent": "Agentset-Webhook/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000), // 10 seconds timeout
      });

      httpStatus = response.status;
      responseBody = await response.text();

      const isSuccess = httpStatus >= 200 && httpStatus < 300;

      // Record to Tinybird (only on final attempt or success to avoid duplicate logs)
      if (isSuccess || isFinalAttempt) {
        await recordWebhookEvent({
          event_id: eventId,
          webhook_id: webhookId,
          task_id: taskId,
          event: event as z.infer<typeof webhookEventSchemaTB>["event"],
          url,
          http_status: httpStatus,
          request_body: JSON.stringify(payload),
          response_body: responseBody.slice(0, 10000), // Limit response body size
        });
      }

      if (isSuccess) {
        // Atomic reset failure count on success
        await resetWebhookFailureCount({ db, webhookId });
        return { success: true, status: httpStatus, response: responseBody };
      }

      // Handle failure
      throw new Error(`Webhook returned status ${httpStatus}: ${responseBody}`);
    } catch (error) {
      // Record failure to Tinybird if not already recorded (only on final attempt)
      if (httpStatus === 0 && isFinalAttempt) {
        httpStatus = 503;
        responseBody = error instanceof Error ? error.message : "Unknown error";

        await recordWebhookEvent({
          event_id: eventId,
          webhook_id: webhookId,
          task_id: taskId,
          event: event as z.infer<typeof webhookEventSchemaTB>["event"],
          url,
          http_status: httpStatus,
          request_body: JSON.stringify(payload),
          response_body: responseBody,
        });
      }

      // Only update failure count on final attempt to avoid counting retries
      if (!isFinalAttempt) {
        throw error;
      }

      // Handle failure (increments count, determines if notification/disable needed)
      const { webhook, shouldNotify, shouldDisable, wasDisabled } =
        await handleWebhookFailure({ db, webhookId });

      // Skip notifications if already disabled
      if (wasDisabled) {
        throw error;
      }

      // Send notification email at thresholds (5, 10, 15)
      if (shouldNotify) {
        const owner = await getOrganizationOwner({
          db,
          organizationId: webhook.organizationId,
        });
        if (owner) {
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
      }

      // Disable webhook if threshold reached
      if (shouldDisable) {
        await disableWebhook({
          db,
          webhookId,
          organizationId: webhook.organizationId,
        });

        // Send disabled notification email
        const owner = await getOrganizationOwner({
          db,
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

      throw error;
    }
  },
});
