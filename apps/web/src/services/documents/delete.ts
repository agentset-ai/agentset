import { AgentsetApiError } from "@/lib/api/errors";
import { emitDocumentWebhook } from "@/lib/webhook/emit";
import { waitUntil } from "@vercel/functions";

import { DocumentStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { triggerDeleteDocument } from "@agentset/jobs";

import { getDocumentOrThrow } from "./get";

export const deleteDocument = async ({
  documentId,
  organizationId,
}: {
  documentId: string;
  organizationId: string;
}) => {
  const updatedDoc = await db.document.update({
    where: { id: documentId },
    data: {
      status: DocumentStatus.QUEUED_FOR_DELETE,
    },
  });

  const handle = await triggerDeleteDocument({
    documentId: updatedDoc.id,
    updateCounters: true,
  });

  await db.document.update({
    where: { id: updatedDoc.id },
    data: {
      workflowRunsIds: { push: handle.id },
    },
  });

  waitUntil(
    emitDocumentWebhook({
      trigger: "document.queued_for_deletion",
      document: {
        ...updatedDoc,
        organizationId,
      },
    }),
  );

  return updatedDoc;
};

/**
 * Looks up a document (scoped to the namespace and, when provided, the
 * tenant), validates it isn't already being deleted, then queues it for
 * deletion via {@link deleteDocument}.
 */
export const queueDocumentDeletion = async ({
  namespaceId,
  organizationId,
  documentId,
  tenantId,
}: {
  namespaceId: string;
  organizationId: string;
  documentId: string;
  tenantId?: string;
}) => {
  const document = await getDocumentOrThrow({
    namespaceId,
    documentId,
    tenantId,
  });

  if (
    document.status === DocumentStatus.QUEUED_FOR_DELETE ||
    document.status === DocumentStatus.DELETING
  ) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Document is already being deleted",
    });
  }

  return deleteDocument({ documentId: document.id, organizationId });
};
