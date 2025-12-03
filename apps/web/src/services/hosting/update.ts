import { env } from "@/env";
import { AgentsetApiError } from "@/lib/api/errors";
import { prefixId } from "@/lib/api/ids";
import { updateHostingSchema } from "@/schemas/api/hosting";
import { getCache, waitUntil } from "@vercel/functions";
import { nanoid } from "nanoid";
import { z } from "zod/v4";

import { Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";
import { deleteAsset, uploadImage } from "@agentset/storage";

export const updateHosting = async ({
  namespaceId,
  input,
}: {
  namespaceId: string;
  input: z.infer<typeof updateHostingSchema>;
}) => {
  const hosting = await db.hosting.findFirst({
    where: { namespaceId },
    select: {
      id: true,
      namespaceId: true,
      logo: true,
      rerankConfig: true,
    },
  });

  if (!hosting) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Hosting is not enabled for this namespace",
    });
  }

  const logo = input.logo;
  const newLogo =
    typeof logo === "string"
      ? await uploadImage(
          `namespaces/${prefixId(namespaceId, "ns_")}/hosting/logo_${nanoid(7)}`,
          logo,
        )
      : logo;

  const newRerankConfig = hosting.rerankConfig
    ? structuredClone(hosting.rerankConfig)
    : ({} as PrismaJson.HostingRerankConfig);

  if (input.rerankModel) newRerankConfig.model = input.rerankModel;
  if (input.rerankLimit) newRerankConfig.limit = input.rerankLimit;

  try {
    const updatedHosting = await db.hosting.update({
      where: {
        id: hosting.id,
      },
      data: {
        title: input.title,
        ...(input.slug && { slug: input.slug }),
        ...(newLogo !== undefined && {
          logo: newLogo ? newLogo.url : null,
        }),
        protected: input.protected,
        allowedEmails: input.allowedEmails ?? undefined,
        allowedEmailDomains: input.allowedEmailDomains ?? undefined,
        systemPrompt: input.systemPrompt,
        exampleQuestions: input.exampleQuestions,
        exampleSearchQueries: input.exampleSearchQueries,
        welcomeMessage: input.welcomeMessage,
        citationMetadataPath: input.citationMetadataPath,
        searchEnabled: input.searchEnabled,
        ...(newRerankConfig && { rerankConfig: newRerankConfig }),
        ...(input.llmModel && {
          llmConfig: { model: input.llmModel },
        }),
        ...(input.topK && { topK: input.topK }),
      },
    });

    // Expire cache
    await getCache().expireTag(`hosting:${hosting.id}`);

    // Delete old logo if it exists
    if ((newLogo || newLogo === null) && hosting.logo) {
      waitUntil(deleteAsset(hosting.logo.replace(`${env.ASSETS_S3_URL}/`, "")));
    }

    return updatedHosting;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AgentsetApiError({
        code: "conflict",
        message: `The slug "${input.slug}" is already in use.`,
      });
    }
    throw error;
  }
};
