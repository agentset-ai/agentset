import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler";
import { normalizeId, prefixId } from "@/lib/api/ids";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { IngestJobSchema } from "@/schemas/api/ingest-job";
import { deleteIngestJob } from "@/services/ingest-jobs/delete";

import { IngestJobStatus } from "@agentset/db";
import { db } from "@agentset/db/client";

export const GET = withNamespaceApiHandler(
  async ({ params, namespace, headers }) => {
    const jobId = normalizeId(params.jobId ?? "", "job_");
    if (!jobId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid job id",
      });
    }

    const data = await db.ingestJob.findUnique({
      where: {
        id: jobId,
        namespaceId: namespace.id,
      },
    });

    if (!data) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Ingest job not found",
      });
    }

    return makeApiSuccessResponse({
      data: IngestJobSchema.parse({
        ...data,
        id: prefixId(data.id, "job_"),
        namespaceId: prefixId(data.namespaceId, "ns_"),
      }),
      headers,
    });
  },
  {
    logging: {
      routeName: "GET /v1/namespace/[namespaceId]/ingest-jobs/[jobId]",
    },
  },
);

export const DELETE = withNamespaceApiHandler(
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
        message: "Ingest job is already being deleted",
      });
    }

    const data = await deleteIngestJob(jobId);

    return makeApiSuccessResponse({
      data: IngestJobSchema.parse({
        ...data,
        id: prefixId(data.id, "job_"),
        namespaceId: prefixId(data.namespaceId, "ns_"),
      }),
      headers,
    });
  },
  {
    logging: {
      routeName: "DELETE /v1/namespace/[namespaceId]/ingest-jobs/[jobId]",
    },
  },
);
