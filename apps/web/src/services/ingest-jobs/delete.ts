import { AgentsetApiError } from "@/lib/api/errors";
import { emitIngestJobWebhook } from "@/lib/webhook/emit";
import { waitUntil } from "@vercel/functions";

import { IngestJobStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { triggerDeleteIngestJob } from "@agentset/jobs";

export const deleteIngestJob = async ({
  jobId,
  namespaceId,
  organizationId,
}: {
  jobId: string;
  namespaceId: string;
  organizationId: string;
}) => {
  const ingestJob = await db.ingestJob.findUnique({
    where: {
      id: jobId,
      namespaceId,
    },
    select: { id: true, status: true },
  });

  if (!ingestJob) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Ingest job not found",
    });
  }

  if (
    ingestJob.status === IngestJobStatus.QUEUED_FOR_DELETE ||
    ingestJob.status === IngestJobStatus.DELETING
  ) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Ingest job is already being deleted",
    });
  }

  const job = await db.ingestJob.update({
    where: { id: ingestJob.id },
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
