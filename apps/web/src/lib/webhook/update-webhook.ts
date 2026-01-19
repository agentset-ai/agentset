import { db } from "@agentset/db/client";

import { webhookCache } from "./cache";

// Toggle webhooks for organization based on active webhook count
export const toggleWebhooksForOrganization = async ({
  organizationId,
}: {
  organizationId: string;
}) => {
  const activeWebhooksCount = await db.webhook.count({
    where: {
      organizationId,
      disabledAt: null,
    },
  });

  await db.organization.update({
    where: {
      id: organizationId,
    },
    data: {
      webhookEnabled: activeWebhooksCount > 0,
    },
  });
};

// Update webhook in cache
export const updateWebhookCache = async ({
  webhookId,
}: {
  webhookId: string;
}) => {
  const webhook = await db.webhook.findUnique({
    where: { id: webhookId },
    select: {
      id: true,
      url: true,
      secret: true,
      triggers: true,
      disabledAt: true,
    },
  });

  if (webhook) {
    await webhookCache.set({
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      triggers: webhook.triggers as string[],
      disabledAt: webhook.disabledAt,
    });
  }
};
