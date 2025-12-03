import { OrganizationStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { triggerDeleteOrganization } from "@agentset/jobs";
import { cancelSubscription } from "@agentset/stripe";

export async function deleteOrganization({
  organizationId,
}: {
  organizationId: string;
}) {
  const org = await db.organization.update({
    where: {
      id: organizationId,
    },
    data: {
      status: OrganizationStatus.DELETING,
    },
    select: {
      id: true,
      stripeId: true,
      namespaces: {
        select: {
          id: true,
        },
      },
    },
  });

  if (org.stripeId) {
    await cancelSubscription(org.stripeId);
  }

  await triggerDeleteOrganization({
    organizationId,
  });
}
