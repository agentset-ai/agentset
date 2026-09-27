import { Redis } from "@upstash/redis";

// Event payloads are read when the delivery run starts
export const WEBHOOK_EVENT_TTL_SECONDS = 60 * 60 * 24 * 3; // 3 days

let redis: Redis | undefined;
const getRedis = () =>
  (redis ??= new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN,
  }));

export const getWebhookEventKey = (eventId: string) =>
  `webhook-event:${eventId}`;

export const storeWebhookEventPayload = async (
  eventId: string,
  payload: unknown,
) => {
  await getRedis().set(getWebhookEventKey(eventId), payload, {
    ex: WEBHOOK_EVENT_TTL_SECONDS,
  });
};

export const getWebhookEventPayload = (eventId: string) =>
  getRedis().get<unknown>(getWebhookEventKey(eventId));
