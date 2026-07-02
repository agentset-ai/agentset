import { AgentsetApiError } from "@/lib/api/errors";

import { db } from "@agentset/db/client";
import { normalizeId } from "@agentset/utils";

/**
 * Finds a document by ID scoped to a namespace, and to a tenant when one is
 * provided (e.g. via the `x-tenant-id` header). A document belonging to a
 * different tenant is treated as not found.
 *
 * Throws the same errors as the public API: `bad_request` for an invalid ID
 * and `not_found` when the document doesn't exist.
 */
export const getDocumentOrThrow = async ({
  namespaceId,
  documentId: rawDocumentId,
  tenantId,
}: {
  namespaceId: string;
  documentId: string;
  tenantId?: string;
}) => {
  const documentId = normalizeId(rawDocumentId, "doc_");
  if (!documentId) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Invalid document ID",
    });
  }

  const document = await db.document.findUnique({
    where: {
      id: documentId,
      namespaceId,
      tenantId,
    },
  });

  if (!document) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Document not found",
    });
  }

  return document;
};
