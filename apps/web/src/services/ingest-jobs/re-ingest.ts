import { AgentsetApiError } from "@/lib/api/errors";
import { emitIngestJobWebhook } from "@/lib/webhook/emit";
import { waitUntil } from "@vercel/functions";

import { IngestJobStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { triggerReIngestJob } from "@agentset/jobs";

export const reIngestJob = async ({
  jobId,
  namespaceId,
  organizationId,
  plan,
}: {
  jobId: string;
  namespaceId: string;
  organizationId: string;
  /** The organization's plan. When omitted, it's fetched in parallel with the job lookup. */
  plan?: string;
}) => {
  const [ingestJob, resolvedPlan] = await Promise.all([
    db.ingestJob.findUnique({
      where: {
        id: jobId,
        namespaceId,
      },
      select: { id: true, status: true },
    }),
    plan ??
      db.organization
        .findUnique({
          where: { id: organizationId },
          select: { plan: true },
        })
        .then((organization) => organization?.plan),
  ]);

  if (!ingestJob) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Ingest job not found",
    });
  }

  if (!resolvedPlan) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Organization not found",
    });
  }

  if (
    ingestJob.status === IngestJobStatus.QUEUED_FOR_DELETE ||
    ingestJob.status === IngestJobStatus.DELETING
  ) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Ingest job is being deleted",
    });
  }

  if (
    ingestJob.status === IngestJobStatus.PRE_PROCESSING ||
    ingestJob.status === IngestJobStatus.PROCESSING
  ) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Ingest job is already being processed",
    });
  }

  const handle = await triggerReIngestJob(
    {
      jobId: ingestJob.id,
    },
    resolvedPlan,
  );

  const job = await db.ingestJob.update({
    where: { id: ingestJob.id },
    data: {
      status: IngestJobStatus.QUEUED_FOR_RESYNC,
      queuedAt: new Date(),
      workflowRunsIds: { push: handle.id },
    },
  });

  // Emit ingest_job.queued_for_resync webhook
  waitUntil(
    emitIngestJobWebhook({
      trigger: "ingest_job.queued_for_resync",
      ingestJob: {
        ...job,
        organizationId,
      },
    }),
  );

  return job;
};
