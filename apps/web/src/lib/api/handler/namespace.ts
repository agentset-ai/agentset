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
  const namespace = await unstable_cache(
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

  if (!namespace) return namespace;

  // unstable_cache JSON-serializes its value, so cache hits revive DateTime
  // columns as strings — which fails the z.date() output schemas downstream
  // (GET /v1/namespace/{namespaceId} 500'd on a warm cache)
  return {
    ...namespace,
    createdAt: new Date(namespace.createdAt),
    updatedAt: new Date(namespace.updatedAt),
  };
};
