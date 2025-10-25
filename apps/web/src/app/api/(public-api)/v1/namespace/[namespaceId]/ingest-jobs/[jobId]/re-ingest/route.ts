import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler";
import { normalizeId, prefixId } from "@/lib/api/ids";
import { makeApiSuccessResponse } from "@/lib/api/response";

import { db, IngestJobStatus } from "@agentset/db";
import { triggerReIngestJob } from "@agentset/jobs";

export const POST = withNamespaceApiHandler(
  async ({ params, namespace, headers, organization }) => {
    const jobId = normalizeId(params.jobId ?? "", "job_");
    if (!jobId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid job id",
      });
    }

    const ingestJob = await db.ingestJob.findUnique({
      where: {
        id: jobId,
        namespaceId: namespace.id,
      },
      select: {
        id: true,
        status: true,
      },
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
      organization.plan,
    );

    await db.ingestJob.update({
      where: { id: ingestJob.id },
      data: {
        status: IngestJobStatus.QUEUED_FOR_RESYNC,
        queuedAt: new Date(),
        workflowRunsIds: { push: handle.id },
      },
      select: {
        id: true,
      },
    });

    return makeApiSuccessResponse({
      data: {
        id: prefixId(ingestJob.id, "job_"),
      },
      headers,
    });
  },
  {
    logging: {
      routeName:
        "POST /v1/namespace/[namespaceId]/ingest-jobs/[jobId]/re-ingest",
    },
  },
);
