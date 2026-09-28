import type { z } from "zod/v4";
import { AbortTaskRunError, wait } from "@trigger.dev/sdk";

import { webhookPayloadSchema } from "@agentset/webhooks";

import type {
  sendWebhookBodySchema,
  sendWebhookInlineBodySchema,
} from "./schema";

type SendWebhookBody = z.infer<typeof sendWebhookBodySchema>;
type WebhookDelivery = z.infer<typeof sendWebhookInlineBodySchema>;

/**
 * Returns the webhook URL, secret and event payload for a delivery run.
 * ID-only bodies (EU) load them from the database and the event store; the
 * run fails without retrying when either is gone.
 */
export const resolveWebhookDelivery = async (
  body: SendWebhookBody,
  {
    getWebhook,
    getEventPayload,
  }: {
    getWebhook: (
      webhookId: string,
    ) => Promise<{ url: string; secret: string } | null>;
    getEventPayload: (eventId: string) => Promise<unknown>;
  },
): Promise<WebhookDelivery> => {
  if ("url" in body) return body;

  const [webhook, payload] = await Promise.all([
    getWebhook(body.webhookId),
    getEventPayload(body.eventId),
  ]);

  if (!webhook) {
    throw new AbortTaskRunError("Webhook not found");
  }

  const parsedPayload = webhookPayloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new AbortTaskRunError("Webhook event payload not found or expired");
  }

  return {
    webhookId: body.webhookId,
    eventId: body.eventId,
    event: parsedPayload.data.event,
    url: webhook.url,
    secret: webhook.secret,
    payload,
  };
};

const WEBHOOK_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 10;

// Same schedule as the retry.fetch options in send-webhook: responses with a
// 3xx-5xx status back off 12s, 2m24s, 28m48s, 5h45m36s, then 24h.
const getStatusRetryDelay = (attempt: number) =>
  attempt >= MAX_ATTEMPTS
    ? undefined
    : Math.min(86_400_000, 12_000 * 12 ** (attempt - 1));

// Timeouts and connection errors follow retry.fetch's defaults as of
// @trigger.dev/sdk 4.3.0: 3 attempts, randomized 1s-60s backoff with factor 2.
const getErrorRetryDelay = (error: unknown, attempt: number) => {
  const isTimeout = error instanceof Error && error.name === "AbortError";
  const isConnectionError =
    error instanceof TypeError && error.cause instanceof Error;
  if ((!isTimeout && !isConnectionError) || attempt >= 3) return;

  return Math.round(
    Math.min(60_000, (Math.random() + 1) * 1000 * 2 ** (attempt - 1)),
  );
};

const waitFor = async (ms: number) => {
  await wait.until({ date: new Date(Date.now() + ms) });
};

/**
 * POSTs a webhook with the same retry schedule as retry.fetch. Used on EU,
 * where run traces carry only IDs.
 */
export const fetchWebhookWithRetry = async (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
  sleep: (ms: number) => Promise<void> = waitFor,
): Promise<Response> => {
  for (let attempt = 1; ; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: { ...init.headers, "x-retry-count": attempt.toString() },
        signal: controller.signal,
      });
    } catch (error) {
      const delay = getErrorRetryDelay(error, attempt);
      if (delay === undefined) throw error;

      await sleep(delay);
      continue;
    } finally {
      clearTimeout(timeout);
    }

    if (response.status < 300 || response.status > 599) return response;

    const delay = getStatusRetryDelay(attempt);
    if (delay === undefined) return response;

    await sleep(delay);
  }
};
