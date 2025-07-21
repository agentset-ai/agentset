import { triggerDeleteNamespace } from "@/lib/workflow";

import { db, OrganizationStatus } from "@agentset/db";
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

  if (org.namespaces.length > 0) {
    await Promise.all(
      org.namespaces.map((namespace) =>
        triggerDeleteNamespace({
          namespaceId: namespace.id,
          deleteOrgWhenDone: true,
        }),
      ),
    );
  }
}
