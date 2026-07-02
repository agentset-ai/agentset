import { toggleWebhooksForOrganization } from "@/lib/webhook/update-webhook";

import { db } from "@agentset/db/client";

export const deleteWebhook = async ({
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

  await db.webhook.delete({
    where: { id: webhookId },
  });

  await toggleWebhooksForOrganization({
    organizationId,
  });

  return webhook;
};
