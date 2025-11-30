/**
 * Delete ingest job
 *
 * Marks an ingest job for deletion and triggers the deletion process.
 * Verifies the job exists and belongs to the namespace.
 */

import { AgentsetApiError } from "@/lib/api/errors";

import { IngestJobStatus } from "@agentset/db";
import { triggerDeleteIngestJob } from "@agentset/jobs";

import type { AgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export const deleteIngestJob = async (
  context: AgentsetContext,
  input: { jobId: string; namespaceId: string },
) => {
  await getNamespace(context, { id: input.namespaceId });

  const ingestJob = await context.db.ingestJob.findUnique({
    where: {
      id: input.jobId,
      namespaceId: input.namespaceId,
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
      message: "Job is already queued for deletion or being deleted",
    });
  }

  const job = await context.db.ingestJob.update({
    where: { id: ingestJob.id },
    data: {
      status: IngestJobStatus.QUEUED_FOR_DELETE,
    },
  });

  const handle = await triggerDeleteIngestJob({
    jobId: job.id,
  });

  await context.db.ingestJob.update({
    where: { id: job.id },
    data: {
      workflowRunsIds: { push: handle.id },
    },
    select: { id: true },
  });

  return job;
};
