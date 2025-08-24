import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler";
import { normalizeId, prefixId } from "@/lib/api/ids";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { IngestJobSchema } from "@/schemas/api/ingest-job";

import { db, IngestJobStatus } from "@agentset/db";
import { triggerReIngestJob } from "@agentset/jobs";

export const POST = withNamespaceApiHandler(
  async ({ params, namespace, headers }) => {
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

    const handle = await triggerReIngestJob({
      jobId: ingestJob.id,
    });

    const data = await db.ingestJob.update({
      where: { id: ingestJob.id },
      data: {
        status: IngestJobStatus.QUEUED_FOR_RESYNC,
        queuedAt: new Date(),
        workflowRunsIds: { push: handle.id },
      },
    });

    return makeApiSuccessResponse({
      data: IngestJobSchema.parse({
        ...data,
        id: prefixId(data.id, "job_"),
        namespaceId: prefixId(data.namespaceId, "ns_"),
      }),
      headers,
    });
  },
);
