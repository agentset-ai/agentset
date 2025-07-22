import { tasks } from "@trigger.dev/sdk";

import type { DeleteIngestJobBody } from "@agentset/jobs";
import { db, IngestJobStatus } from "@agentset/db";
import { DELETE_INGEST_JOB_ID } from "@agentset/jobs";

export const deleteIngestJob = async (jobId: string) => {
  const job = await db.ingestJob.update({
    where: { id: jobId },
    data: {
      status: IngestJobStatus.QUEUED_FOR_DELETE,
    },
  });

  const handle = await tasks.trigger(DELETE_INGEST_JOB_ID, {
    jobId: job.id,
  } satisfies DeleteIngestJobBody);

  await db.ingestJob.update({
    where: { id: job.id },
    data: {
      workflowRunsIds: { push: handle.id },
    },
    select: { id: true },
  });

  return job;
};
