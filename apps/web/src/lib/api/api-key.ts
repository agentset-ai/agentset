import { unstable_cache } from "next/cache";

import { db } from "@agentset/db";

export const getApiKeyInfo = async (apiKey: string) => {
  const apiKeyData = await unstable_cache(
    async () => {
      const data = await db.organizationApiKey.findUnique({
        where: {
          key: apiKey,
        },
        select: {
          scope: true,
          organizationId: true,
        },
      });

      return data;
    },
    ["apiKey", apiKey],
    {
      tags: [`apiKey:${apiKey}`],
      revalidate: 60 * 30, // 30 minutes
    },
  )();

  if (!apiKeyData) return null;

  const orgData = await unstable_cache(
    async () => {
      return db.organization.findUnique({
        where: {
          id: apiKeyData?.organizationId,
        },
        select: {
          name: true,
          plan: true,
          apiRatelimit: true,
          searchLimit: true,
          searchUsage: true,
          totalPages: true,
          pagesLimit: true,
        },
      });
    },
    ["organization", apiKeyData.organizationId],
    {
      tags: [`org:${apiKeyData.organizationId}`],
      revalidate: 60 * 5, // 5 min
    },
  )();

  if (!orgData) return null;

  return {
    ...apiKeyData,
    organization: orgData,
  };
};

export type ApiKeyInfo = NonNullable<Awaited<ReturnType<typeof getApiKeyInfo>>>;
