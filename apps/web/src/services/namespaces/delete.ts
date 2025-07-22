import { tasks } from "@trigger.dev/sdk";

import type { DeleteNamespaceBody } from "@agentset/jobs";
import { db, NamespaceStatus } from "@agentset/db";
import { DELETE_NAMESPACE_JOB_ID } from "@agentset/jobs";

export const deleteNamespace = async ({
  namespaceId,
}: {
  namespaceId: string;
}) => {
  await db.namespace.update({
    where: { id: namespaceId },
    data: { status: NamespaceStatus.DELETING },
  });

  await tasks.trigger(DELETE_NAMESPACE_JOB_ID, {
    namespaceId,
  } satisfies DeleteNamespaceBody);
};
