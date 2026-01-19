import { db } from "@agentset/db/client";

import type { WebhookTrigger } from "@agentset/webhooks";

interface GetWebhooksProps {
  organizationId: string;
  triggers?: WebhookTrigger[];
  disabled?: boolean;
}

export async function getWebhooks({
  organizationId,
  triggers,
  disabled,
}: GetWebhooksProps) {
  return await db.webhook.findMany({
    where: {
      organizationId,
      ...(triggers ? { triggers: { array_contains: triggers } } : {}),
      ...(disabled !== undefined
        ? { disabledAt: disabled ? { not: null } : null }
        : {}),
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
    orderBy: {
      createdAt: "desc",
    },
  });
}
