import { Redis } from "@upstash/redis";

import type { WebhookTrigger } from "./types";

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

const ORG_CACHE_PREFIX = `webhook:org`;

// Cached webhook data for an organization
export type CachedWebhook = {
  id: string;
  url: string;
  secret: string;
  triggers: WebhookTrigger[];
  disabledAt: string | null;
  namespaceIds: string[];
};

class WebhookCache {
  // Get all webhooks for an organization from cache
  async getOrgWebhooks(
    organizationId: string,
  ): Promise<CachedWebhook[] | null> {
    const cached = await redis.get<CachedWebhook[]>(
      this._createOrgKey(organizationId),
    );
    return cached;
  }

  // Set all webhooks for an organization in cache
  async setOrgWebhooks(
    organizationId: string,
    webhooks: CachedWebhook[],
  ): Promise<void> {
    await redis.set(this._createOrgKey(organizationId), webhooks);
  }

  // Invalidate cache for an organization
  async invalidateOrg(organizationId: string): Promise<void> {
    await redis.del(this._createOrgKey(organizationId));
  }

  private _createOrgKey(organizationId: string) {
    return `${ORG_CACHE_PREFIX}:${organizationId}`;
  }
}

export const webhookCache = new WebhookCache();
