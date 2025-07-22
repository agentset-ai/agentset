import { tasks } from "@trigger.dev/sdk";

import type { DeleteOrganizationBody } from "@agentset/jobs";
import { db, OrganizationStatus } from "@agentset/db";
import { DELETE_ORGANIZATION_JOB_ID } from "@agentset/jobs";
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

  await tasks.trigger(DELETE_ORGANIZATION_JOB_ID, {
    organizationId,
  } satisfies DeleteOrganizationBody);
}
