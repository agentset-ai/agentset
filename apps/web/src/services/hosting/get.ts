import { db } from "@agentset/db";

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
