import { emitIngestJobWebhook } from "@/lib/webhook/emit";
import { waitUntil } from "@vercel/functions";

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

  // Emit ingest_job.queued_for_deletion webhook
  waitUntil(
    emitIngestJobWebhook({
      trigger: "ingest_job.queued_for_deletion",
      ingestJob: {
        ...job,
        organizationId,
      },
    }),
  );

  return job;
};
