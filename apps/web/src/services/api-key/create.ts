import { revalidateTag } from "next/cache";
import { z } from "zod/v4";

import { db } from "@agentset/db/client";

const keyGenerator = (prefix?: string, length = 16) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let apiKey = `${prefix || ""}`;
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    apiKey += characters[randomIndex];
  }

  return apiKey;
};

export const createApiKeySchema = z.object({
  organizationId: z.string(),
  label: z.string(),
  scope: z.enum(["all"]),
});

export const createApiKey = async (
  data: z.infer<typeof createApiKeySchema>,
) => {
  const apiKey = await db.organizationApiKey.create({
    data: {
      label: data.label,
      scope: data.scope,
      organizationId: data.organizationId,
      key: keyGenerator("agentset_"),
    },
  });

  revalidateTag(`apiKey:${apiKey.key}`, "max");

  return apiKey;
};
