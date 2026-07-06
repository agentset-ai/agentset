import { transformWebhook } from "@/lib/webhook/transform";

import { db } from "@agentset/db/client";

export const getWebhook = async ({
  organizationId,
  webhookId,
}: {
  organizationId: string;
  webhookId: string;
}) => {
  const webhook = await db.webhook.findUnique({
    where: {
      id: webhookId,
      organizationId,
    },
    select: {
      id: true,
      name: true,
      url: true,
      secret: true,
      triggers: true,
      disabledAt: true,
      consecutiveFailures: true,
      lastFailedAt: true,
      createdAt: true,
      namespaces: {
        select: {
          namespaceId: true,
        },
      },
    },
  });

  if (!webhook) return null;

  return {
    ...transformWebhook(webhook),
    consecutiveFailures: webhook.consecutiveFailures,
    lastFailedAt: webhook.lastFailedAt,
    createdAt: webhook.createdAt,
  };
};
