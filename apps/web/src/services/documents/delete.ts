import { tasks } from "@trigger.dev/sdk";

import type { DeleteDocumentBody } from "@agentset/jobs";
import { db, DocumentStatus } from "@agentset/db";
import { DELETE_DOCUMENT_JOB_ID } from "@agentset/jobs";

export const deleteDocument = async (documentId: string) => {
  const updatedDoc = await db.document.update({
    where: { id: documentId },
    data: {
      status: DocumentStatus.QUEUED_FOR_DELETE,
    },
  });

  const handle = await tasks.trigger(DELETE_DOCUMENT_JOB_ID, {
    documentId: updatedDoc.id,
  } satisfies DeleteDocumentBody);

  await db.document.update({
    where: { id: updatedDoc.id },
    data: {
      workflowRunsIds: { push: handle.id },
    },
  });

  return updatedDoc;
};
