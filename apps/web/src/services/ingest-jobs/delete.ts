import { db, IngestJobStatus } from "@agentset/db";
import { triggerDeleteIngestJob } from "@agentset/jobs";

export const deleteIngestJob = async (jobId: string) => {
  const job = await db.ingestJob.update({
    where: { id: jobId },
    data: {
      status: IngestJobStatus.QUEUED_FOR_DELETE,
    },
  });

  const handle = await triggerDeleteIngestJob({
    jobId: job.id,
  });

  await db.ingestJob.update({
    where: { id: job.id },
    data: {
      workflowRunsIds: { push: handle.id },
    },
    select: { id: true },
  });

  return job;
};
