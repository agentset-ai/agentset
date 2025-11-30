/**
 * Update hosting configuration
 *
 * Updates hosting settings for a namespace, including logo upload.
 */

import type { updateHostingSchema } from "@/schemas/api/hosting";
import type { z } from "zod/v4";
import { env } from "@/env";
import { AgentsetApiError } from "@/lib/api/errors";
import { prefixId } from "@/lib/api/ids";
import { getCache, waitUntil } from "@vercel/functions";
import { nanoid } from "nanoid";

import { Prisma } from "@agentset/db";
import { deleteAsset, uploadImage } from "@agentset/storage";

import type { AgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export const updateHosting = async (
  context: AgentsetContext,
  input: {
    namespaceId: string;
    data: z.infer<typeof updateHostingSchema>;
  },
) => {
  const namespace = await getNamespace(context, { id: input.namespaceId });

  const hosting = await context.db.hosting.findFirst({
    where: { namespaceId: namespace.id },
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

  const logo = input.data.logo;
  const newLogo =
    typeof logo === "string"
      ? await uploadImage(
          `namespaces/${prefixId(input.namespaceId, "ns_")}/hosting/logo_${nanoid(7)}`,
          logo,
        )
      : logo;

  const newRerankConfig = hosting.rerankConfig
    ? structuredClone(hosting.rerankConfig)
    : ({} as PrismaJson.HostingRerankConfig);

  if (input.data.rerankModel) newRerankConfig.model = input.data.rerankModel;
  if (input.data.rerankLimit) newRerankConfig.limit = input.data.rerankLimit;

  try {
    const updatedHosting = await context.db.hosting.update({
      where: {
        id: hosting.id,
      },
      data: {
        title: input.data.title,
        ...(input.data.slug && { slug: input.data.slug }),
        ...(newLogo !== undefined && {
          logo: newLogo ? newLogo.url : null,
        }),
        protected: input.data.protected,
        allowedEmails: input.data.allowedEmails ?? undefined,
        allowedEmailDomains: input.data.allowedEmailDomains ?? undefined,
        systemPrompt: input.data.systemPrompt,
        exampleQuestions: input.data.exampleQuestions,
        exampleSearchQueries: input.data.exampleSearchQueries,
        welcomeMessage: input.data.welcomeMessage,
        citationMetadataPath: input.data.citationMetadataPath,
        searchEnabled: input.data.searchEnabled,
        ...(newRerankConfig && { rerankConfig: newRerankConfig }),
        ...(input.data.llmModel && {
          llmConfig: { model: input.data.llmModel },
        }),
        ...(input.data.topK && { topK: input.data.topK }),
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
        message: `The slug "${input.data.slug}" is already in use.`,
      });
    }
    throw error;
  }
};
