/**
 * Create namespace
 *
 * Creates a new namespace with validation and transaction handling.
 * Verifies user has admin/owner role in the organization.
 */

import { AgentsetApiError } from "@/lib/api/errors";

import type { Namespace } from "@agentset/db";

import type { AgentsetContext } from "../shared/context";
import { validateEmbeddingModel, validateVectorStoreConfig } from "./validate";

export type CreateNamespaceInput = {
  name: string;
  slug: string;
  orgId: string;
  embeddingConfig?: NonNullable<Namespace["embeddingConfig"]>;
  vectorStoreConfig?: NonNullable<Namespace["vectorStoreConfig"]>;
};

export const createNamespace = async (
  context: AgentsetContext,
  input: CreateNamespaceInput,
) => {
  // Verify user is a member with admin/owner role (only if session exists)
  // Public API routes authenticate via API key, so session may be null
  if (context.session) {
    const member = await context.db.member.findFirst({
      where: {
        userId: context.session.user.id,
        organizationId: input.orgId,
        role: {
          in: ["admin", "owner"],
        },
      },
      select: {
        id: true,
      },
    });

    if (!member) {
      throw new AgentsetApiError({
        code: "unauthorized",
        message: "You must be an admin or owner to create namespaces",
      });
    }
  }
  // If no session, assume API key authentication already verified organization access

  // Validate embedding model
  const embeddingConfig = input.embeddingConfig ?? {
    provider: "MANAGED_OPENAI",
    model: "text-embedding-3-large",
  };
  const { success: isValidEmbedding, error: embeddingError } =
    await validateEmbeddingModel(embeddingConfig);
  if (!isValidEmbedding) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: embeddingError || "Invalid embedding model",
    });
  }

  // Validate vector store config
  const vectorStoreConfig = input.vectorStoreConfig ?? {
    provider: "MANAGED_PINECONE",
  };
  const { success: isValidVectorStore, error: vectorStoreError } =
    await validateVectorStoreConfig(vectorStoreConfig, embeddingConfig);
  if (!isValidVectorStore) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: vectorStoreError || "Invalid vector store config",
    });
  }

  // Create namespace and update organization count in a transaction
  const [namespace] = await context.db.$transaction([
    context.db.namespace.create({
      data: {
        name: input.name,
        slug: input.slug,
        organizationId: input.orgId,
        embeddingConfig,
        vectorStoreConfig,
      },
    }),
    context.db.organization.update({
      where: { id: input.orgId },
      data: { totalNamespaces: { increment: 1 } },
    }),
  ]);

  return namespace;
};
