import { DocumentStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { triggerDeleteDocument } from "@agentset/jobs";

export const deleteDocument = async (documentId: string) => {
  const updatedDoc = await db.document.update({
    where: { id: documentId },
    data: {
      status: DocumentStatus.QUEUED_FOR_DELETE,
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
