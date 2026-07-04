import { unstable_cache } from "next/cache";

import { NamespaceStatus } from "@agentset/db";
import { db } from "@agentset/db/client";

export const getNamespace = async ({
  namespaceId,
  organizationId,
}: {
  namespaceId: string;
  organizationId: string;
}) => {
  return unstable_cache(
    async () => {
      return await db.namespace.findUnique({
        where: {
          id: namespaceId,
          status: NamespaceStatus.ACTIVE,
          organizationId: organizationId,
        },
      });
    },
    ["namespace", namespaceId, organizationId],
    {
      revalidate: 60 * 5, // 5 minutes
      tags: [`org:${organizationId}`, `ns:${namespaceId}`],
    },
  )();
};
