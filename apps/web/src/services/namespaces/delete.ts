import { NamespaceStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { triggerDeleteNamespace } from "@agentset/jobs";

export const deleteNamespace = async ({
  namespaceId,
}: {
  namespaceId: string;
}) => {
  await db.namespace.update({
    where: { id: namespaceId },
    data: { status: NamespaceStatus.DELETING },
  });

  await triggerDeleteNamespace({
    namespaceId,
  });
};
