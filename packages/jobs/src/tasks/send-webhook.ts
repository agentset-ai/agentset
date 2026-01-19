import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod/v4";

import { recordWebhookEvent } from "@agentset/tinybird";
import {
  WEBHOOK_FAILURE_DISABLE_THRESHOLD,
  WEBHOOK_FAILURE_NOTIFY_THRESHOLDS,
} from "@agentset/utils";

import { getDb } from "../db";
import { SEND_WEBHOOK_JOB_ID, sendWebhookBodySchema } from "../schema";

// Create HMAC-SHA256 signature
const createWebhookSignature = async (secret: string, body: unknown) => {
  const keyData = new TextEncoder().encode(secret);
  const messageData = new TextEncoder().encode(JSON.stringify(body));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const sendWebhookTask = schemaTask({
  id: SEND_WEBHOOK_JOB_ID,
  retry: {
    maxAttempts: 5,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  schema: sendWebhookBodySchema,
  run: async ({ webhookId, eventId, event, url, secret, payload }, { ctx }) => {
    const db = getDb();
    const taskId = ctx.run.id;

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
      });

      httpStatus = response.status;
      responseBody = await response.text();

      const isSuccess = httpStatus >= 200 && httpStatus < 300;

      // Record to Tinybird
      await recordWebhookEvent({
        event_id: eventId,
        webhook_id: webhookId,
        task_id: taskId,
        event: event as Parameters<typeof recordWebhookEvent>[0]["event"],
        url,
        http_status: httpStatus,
        request_body: JSON.stringify(payload),
        response_body: responseBody.slice(0, 10000), // Limit response body size
      });

      if (isSuccess) {
        // Reset failure count on success
        const webhook = await db.webhook.findUnique({
          where: { id: webhookId },
          select: { consecutiveFailures: true },
        });

        if (webhook && webhook.consecutiveFailures > 0) {
          await db.webhook.update({
            where: { id: webhookId },
            data: {
              consecutiveFailures: 0,
              lastFailedAt: null,
            },
          });
        }

        return { success: true, status: httpStatus, response: responseBody };
      }

      // Handle failure
      throw new Error(`Webhook returned status ${httpStatus}: ${responseBody}`);
    } catch (error) {
      // Record failure to Tinybird if not already recorded
      if (httpStatus === 0) {
        httpStatus = 503;
        responseBody =
          error instanceof Error ? error.message : "Unknown error";

        await recordWebhookEvent({
          event_id: eventId,
          webhook_id: webhookId,
          task_id: taskId,
          event: event as Parameters<typeof recordWebhookEvent>[0]["event"],
          url,
          http_status: httpStatus,
          request_body: JSON.stringify(payload),
          response_body: responseBody,
        });
      }

      // Update failure count
      const webhook = await db.webhook.update({
        where: { id: webhookId },
        data: {
          consecutiveFailures: { increment: 1 },
          lastFailedAt: new Date(),
        },
        select: {
          consecutiveFailures: true,
          disabledAt: true,
          organizationId: true,
        },
      });

      // Check if we need to disable the webhook
      if (
        !webhook.disabledAt &&
        webhook.consecutiveFailures >= WEBHOOK_FAILURE_DISABLE_THRESHOLD
      ) {
        await db.webhook.update({
          where: { id: webhookId },
          data: { disabledAt: new Date() },
        });

        // Update organization webhookEnabled flag
        const activeWebhooks = await db.webhook.count({
          where: {
            organizationId: webhook.organizationId,
            disabledAt: null,
          },
        });

        if (activeWebhooks === 0) {
          await db.organization.update({
            where: { id: webhook.organizationId },
            data: { webhookEnabled: false },
          });
        }
      }

      // Log notification thresholds (actual email notifications handled elsewhere)
      if (
        WEBHOOK_FAILURE_NOTIFY_THRESHOLDS.includes(
          webhook.consecutiveFailures as 5 | 10 | 15,
        )
      ) {
        console.log(
          `Webhook ${webhookId} has failed ${webhook.consecutiveFailures} times`,
        );
      }

      throw error;
    }
  },
});
