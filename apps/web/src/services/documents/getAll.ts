/**
 * Get all documents service
 *
 * Framework-agnostic document query functionality.
 */

import type { paginationSchema } from "@/schemas/api/pagination";
import type { z } from "zod/v4";
import { getPaginationArgs, paginateResults } from "@/services/pagination";

import type { DocumentStatus } from "@agentset/db";

import type { ProtectedAgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export type GetAllDocumentsInput = {
  namespaceId: string;
  ingestJobId?: string;
  statuses?: DocumentStatus[];
  orderBy?: "createdAt";
  order?: "asc" | "desc";
  cursor?: string;
  cursorDirection?: "forward" | "backward";
  perPage: number;
};

export type DocumentResult = {
  id: string;
  name: string | null;
  totalTokens: number;
  totalChunks: number;
  totalCharacters: number;
  totalPages: number;
  documentProperties: unknown;
  createdAt: Date;
  queuedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  error: string | null;
  status: DocumentStatus;
};

export type GetAllDocumentsResult = {
  records: DocumentResult[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    prevCursor: string | null;
  };
};

/**
 * Get all documents in a namespace
 *
 * @throws {AgentsetApiError} If namespace not found or user doesn't have access
 */
export const getAllDocuments = async (
  context: ProtectedAgentsetContext,
  input: GetAllDocumentsInput,
): Promise<GetAllDocumentsResult> => {
  await getNamespace(context, { id: input.namespaceId });

  const { where, ...paginationArgs } = getPaginationArgs(
    input as z.infer<typeof paginationSchema>,
    {
      orderBy: input.orderBy ?? "createdAt",
      order: input.order ?? "desc",
    },
    "doc_",
  );

  const documents = await context.db.document.findMany({
    where: {
      namespaceId: input.namespaceId,
      ...(input.ingestJobId && { ingestJobId: input.ingestJobId }),
      ...(input.statuses &&
        input.statuses.length > 0 && { status: { in: input.statuses } }),
      ...where,
    },
    select: {
      id: true,
      name: true,
      totalTokens: true,
      totalChunks: true,
      totalCharacters: true,
      totalPages: true,
      documentProperties: true,
      createdAt: true,
      queuedAt: true,
      completedAt: true,
      failedAt: true,
      error: true,
      status: true,
    },
    ...paginationArgs,
  });

  return paginateResults(input as z.infer<typeof paginationSchema>, documents);
};
