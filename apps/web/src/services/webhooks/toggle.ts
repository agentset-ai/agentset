import { transformWebhook } from "@/lib/webhook/transform";
import { toggleWebhooksForOrganization } from "@/lib/webhook/update-webhook";

import { db } from "@agentset/db/client";

export const toggleWebhook = async ({
  organizationId,
  webhookId,
  enabled,
}: {
  organizationId: string;
  webhookId: string;
  // when omitted, the webhook's current state is flipped
  enabled?: boolean;
}) => {
  const webhook = await db.webhook.findUnique({
    where: {
      id: webhookId,
      organizationId,
    },
    select: { disabledAt: true },
  });

  if (!webhook) return null;

  const shouldEnable = enabled ?? !!webhook.disabledAt;
  const disabledAt = shouldEnable ? null : (webhook.disabledAt ?? new Date());

  const updatedWebhook = await db.webhook.update({
    where: { id: webhookId },
    data: {
      disabledAt,
      // Reset failure count when re-enabling
      ...(webhook.disabledAt &&
        shouldEnable && {
          consecutiveFailures: 0,
          lastFailedAt: null,
        }),
    },
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

  await toggleWebhooksForOrganization({
    organizationId,
  });

  return transformWebhook(updatedWebhook);
};
