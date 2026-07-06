import { db } from "@agentset/db/client";

export const listApiKeys = async ({
  organizationId,
}: {
  organizationId: string;
}) => {
  return await db.organizationApiKey.findMany({
    where: {
      organizationId,
    },
    omit: {
      key: true,
    },
  });
};
