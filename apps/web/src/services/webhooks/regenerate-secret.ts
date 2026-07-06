import { createWebhookSecret } from "@/lib/webhook/secret";
import { transformWebhook } from "@/lib/webhook/transform";

import { db } from "@agentset/db/client";
import { webhookCache } from "@agentset/webhooks/server";

export const regenerateWebhookSecret = async ({
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
  });

  if (!webhook) return null;

  const newSecret = createWebhookSecret();

  const updatedWebhook = await db.webhook.update({
    where: { id: webhookId },
    data: { secret: newSecret },
    select: {
      id: true,
      name: true,
      url: true,
      secret: true,
      triggers: true,
      disabledAt: true,
      namespaces: {
        select: {
          namespaceId: true,
        },
      },
    },
  });

  // Invalidate webhook cache
  await webhookCache.invalidateOrg(organizationId);

  return transformWebhook(updatedWebhook);
};
