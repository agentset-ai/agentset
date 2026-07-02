import type { createNamespaceSchema } from "@/schemas/api/namespace";
import type { z } from "zod/v4";
import { AgentsetApiError } from "@/lib/api/errors";

import { Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";

import { validateEmbeddingModel, validateVectorStoreConfig } from "./validate";

export const createNamespace = async ({
  organizationId,
  data,
}: {
  organizationId: string;
  data: z.infer<typeof createNamespaceSchema>;
}) => {
  const { success: isValidEmbedding, error: embeddingError } =
    await validateEmbeddingModel(data.embeddingConfig);
  if (!isValidEmbedding) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: embeddingError,
    });
  }

  const { success: isValidVectorStore, error: vectorStoreError } =
    await validateVectorStoreConfig(data.vectorStoreConfig, data.embeddingConfig);
  if (!isValidVectorStore) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: vectorStoreError,
    });
  }

  try {
    const [namespace] = await db.$transaction([
      db.namespace.create({
        data: {
          name: data.name,
          slug: data.slug,
          organizationId,
          embeddingConfig: data.embeddingConfig,
          vectorStoreConfig: data.vectorStoreConfig,
        },
      }),
      db.organization.update({
        where: { id: organizationId },
        data: { totalNamespaces: { increment: 1 } },
      }),
    ]);

    return namespace;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AgentsetApiError({
        code: "conflict",
        message: `The slug "${data.slug}" is already in use.`,
      });
    }

    throw error;
  }
};
