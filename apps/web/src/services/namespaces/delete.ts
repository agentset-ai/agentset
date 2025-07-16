import { triggerDeleteNamespace } from "@/lib/workflow";

import { db, NamespaceStatus } from "@agentset/db";

export const deleteNamespace = async ({
  namespaceId,
}: {
  namespaceId: string;
}) => {
  await db.namespace.update({
    where: { id: namespaceId },
    data: { status: NamespaceStatus.DELETING },
  });

  await triggerDeleteNamespace({ namespaceId });
};
