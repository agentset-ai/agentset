import { AgentsetApiError } from "@/lib/api/errors";

import { DocumentStatus } from "@agentset/db";
import { triggerDeleteDocument } from "@agentset/jobs";

import type { AgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export type DeleteDocumentInput = {
  documentId: string;
  namespaceId: string;
};

/**
 * Delete a document
 *
 * Validates namespace access, document existence, and document status before deletion.
 *
 * @throws {AgentsetApiError} If namespace not found, document not found, or document already queued for deletion
 */
export const deleteDocument = async (
  context: AgentsetContext,
  input: DeleteDocumentInput,
) => {
  const namespace = await getNamespace(context, { id: input.namespaceId });

  const document = await context.db.document.findUnique({
    where: {
      id: input.documentId,
      namespaceId: namespace.id,
    },
    select: { id: true, status: true },
  });

  if (!document) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Document not found",
    });
  }

  if (
    document.status === DocumentStatus.QUEUED_FOR_DELETE ||
    document.status === DocumentStatus.DELETING
  ) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Document is already queued for deletion or being deleted",
    });
  }

  const updatedDoc = await context.db.document.update({
    where: { id: input.documentId },
    data: {
      status: DocumentStatus.QUEUED_FOR_DELETE,
    },
  });

  const handle = await triggerDeleteDocument({
    documentId: updatedDoc.id,
  });

  await context.db.document.update({
    where: { id: updatedDoc.id },
    data: {
      workflowRunsIds: { push: handle.id },
    },
  });

  return updatedDoc;
};
