import { unstable_cache } from "next/cache";

import { db } from "@agentset/db/client";

export const getApiKeyInfo = async (apiKey: string) => {
  return unstable_cache(
    async () => {
      const data = await db.organizationApiKey.findUnique({
        where: {
          key: apiKey,
        },
        select: {
          scope: true,
          organizationId: true,
          organization: {
            select: {
              name: true,
              plan: true,
              apiRatelimit: true,
              searchLimit: true,
              searchUsage: true,
              totalPages: true,
              pagesLimit: true,
            },
          },
        },
      });

      return data;
    },
    ["apiKey", apiKey],
    {
      tags: [`apiKey:${apiKey}`],
      revalidate: 60 * 5, // 5 minutes
    },
  )();
};

export type ApiKeyInfo = NonNullable<Awaited<ReturnType<typeof getApiKeyInfo>>>;
