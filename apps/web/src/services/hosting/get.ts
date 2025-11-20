import { db } from "@agentset/db/client";

export const getHosting = async ({ namespaceId }: { namespaceId: string }) => {
  return await db.hosting.findFirst({
    where: {
      namespaceId,
    },
    include: {
      domain: true,
    },
  });
};
