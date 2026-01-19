import { db } from "@agentset/db/client";

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
