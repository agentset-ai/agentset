import { emitIngestJobWebhook } from "@/lib/webhook/emit";

import { IngestJobStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { triggerDeleteIngestJob } from "@agentset/jobs";

export const deleteIngestJob = async ({
  jobId,
  organizationId,
}: {
  jobId: string;
  organizationId: string;
}) => {
  const job = await db.ingestJob.update({
    where: { id: jobId },
    data: {
      status: IngestJobStatus.QUEUED_FOR_DELETE,
    },
    select: {
      id: true,
      name: true,
      namespaceId: true,
      status: true,
      error: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Emit ingest_job.queued_for_deletion webhook
  await emitIngestJobWebhook({
    trigger: "ingest_job.queued_for_deletion",
    ingestJob: {
      ...job,
      organizationId,
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
