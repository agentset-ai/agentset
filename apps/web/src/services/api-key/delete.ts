import { revalidateTag } from "next/cache";

import { db } from "@agentset/db/client";

export const deleteApiKey = async ({
  id,
  organizationId,
}: {
  id: string;
  organizationId: string;
}) => {
  // scoping the delete to the organization prevents deleting another org's key
  const apiKey = await db.organizationApiKey.delete({
    where: {
      id,
      organizationId,
    },
  });

  revalidateTag(`apiKey:${apiKey.key}`, "max");

  return apiKey;
};
