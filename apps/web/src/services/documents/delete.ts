import { emitDocumentWebhook } from "@/lib/webhook/emit";

import { DocumentStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { triggerDeleteDocument } from "@agentset/jobs";

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
    select: {
      id: true,
      name: true,
      namespaceId: true,
      status: true,
      source: true,
      totalCharacters: true,
      totalChunks: true,
      totalPages: true,
      error: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Emit document.queued_for_deletion webhook
  await emitDocumentWebhook({
    trigger: "document.queued_for_deletion",
    document: {
      ...updatedDoc,
      organizationId,
    },
  });

  const handle = await triggerDeleteDocument({
    documentId: updatedDoc.id,
  });

  await db.document.update({
    where: { id: updatedDoc.id },
    data: {
      workflowRunsIds: { push: handle.id },
    },
  });

  return updatedDoc;
};
