import { redis } from "@/lib/redis";

import type { WebhookCacheProps, WebhookTrigger } from "./types";

const WEBHOOK_CACHE_KEY_PREFIX = "webhook";

class WebhookCache {
  async mset(webhooks: WebhookCacheProps[]) {
    if (webhooks.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    webhooks.map((webhook) => {
      pipeline.set(this._createKey(webhook.id), this._format(webhook));
    });

    return await pipeline.exec();
  }

  async set(webhook: WebhookCacheProps) {
    return await redis.set(this._createKey(webhook.id), this._format(webhook));
  }

  async mget(webhookIds: string[]) {
    if (webhookIds.length === 0) {
      return [];
    }

    const webhooks = await redis.mget<WebhookCacheProps[]>(
      webhookIds.map(this._createKey),
    );

    return webhooks.filter(Boolean);
  }

  async get(webhookId: string) {
    return await redis.get<WebhookCacheProps>(this._createKey(webhookId));
  }

  async delete(webhookId: string) {
    return await redis.del(this._createKey(webhookId));
  }

  async deleteMany(webhookIds: string[]) {
    if (webhookIds.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    webhookIds.map((webhookId) => {
      pipeline.del(this._createKey(webhookId));
    });

    return await pipeline.exec();
  }

  _format(webhook: WebhookCacheProps): WebhookCacheProps {
    return {
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      triggers: webhook.triggers as WebhookTrigger[],
      ...(webhook.disabledAt ? { disabledAt: webhook.disabledAt } : {}),
    };
  }

  _createKey(webhookId: string) {
    return `${WEBHOOK_CACHE_KEY_PREFIX}:${webhookId}`;
  }
}

export const webhookCache = new WebhookCache();
