/**
 * Re-ingest job
 *
 * Triggers a re-ingestion of an existing ingest job.
 * Verifies the job exists and is in a valid state for re-ingestion.
 */

import { AgentsetApiError } from "@/lib/api/errors";

import { IngestJobStatus } from "@agentset/db";
import { triggerReIngestJob } from "@agentset/jobs";

import type { ProtectedAgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export const reIngestJob = async (
  context: ProtectedAgentsetContext,
  input: { jobId: string; namespaceId: string },
) => {
  const namespace = await getNamespace(context, {
    id: input.namespaceId,
  });

  const [ingestJob, organization] = await Promise.all([
    context.db.ingestJob.findUnique({
      where: {
        id: input.jobId,
        namespaceId: input.namespaceId,
      },
      select: { id: true, status: true },
    }),
    context.db.organization.findUnique({
      where: { id: namespace.organizationId },
      select: { plan: true },
    }),
  ]);

  if (!ingestJob || !organization) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Ingest job or organization not found",
    });
  }

  if (
    ingestJob.status === IngestJobStatus.PRE_PROCESSING ||
    ingestJob.status === IngestJobStatus.PROCESSING
  ) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Job is already being processed",
    });
  }

  const handle = await triggerReIngestJob(
    {
      jobId: ingestJob.id,
    },
    organization.plan,
  );

  await context.db.ingestJob.update({
    where: { id: ingestJob.id },
    data: {
      status: IngestJobStatus.QUEUED_FOR_RESYNC,
      queuedAt: new Date(),
      workflowRunsIds: { push: handle.id },
    },
    select: { id: true },
  });

  return ingestJob;
};
