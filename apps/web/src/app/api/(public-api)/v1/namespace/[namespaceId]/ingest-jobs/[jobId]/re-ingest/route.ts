import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler";
import { normalizeId, prefixId } from "@agentset/utils";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { reIngestJob } from "@/services/ingest-jobs/re-ingest";

export const POST = withNamespaceApiHandler(
  async ({ params, namespace, headers, organization }) => {
    const jobId = normalizeId(params.jobId ?? "", "job_");
    if (!jobId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid job id",
      });
    }

    const job = await reIngestJob({
      jobId,
      namespaceId: namespace.id,
      organizationId: namespace.organizationId,
      plan: organization.plan,
    });

    return makeApiSuccessResponse({
      data: {
        id: prefixId(job.id, "job_"),
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
