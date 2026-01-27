import { emitDocumentWebhook } from "@/lib/webhook/emit";
import { waitUntil } from "@vercel/functions";

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
  });

  const handle = await triggerDeleteDocument({ documentId: updatedDoc.id });

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
