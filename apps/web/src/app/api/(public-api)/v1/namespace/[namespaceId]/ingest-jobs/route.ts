import { AgentsetApiError, exceededLimitError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler";
import { prefixId } from "@/lib/api/ids";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import {
  createIngestJobSchema,
  getIngestionJobsSchema,
  IngestJobSchema,
} from "@/schemas/api/ingest-job";
import { createIngestJob } from "@/services/ingest-jobs/create";
import { getPaginationArgs, paginateResults } from "@/services/pagination";

import { db } from "@agentset/db";
import { isProPlan } from "@agentset/stripe/plans";

export const GET = withNamespaceApiHandler(
  async ({ searchParams, namespace, tenantId, headers }) => {
    const body = await getIngestionJobsSchema.parseAsync(searchParams);

    const ingestJobs = await db.ingestJob.findMany({
      where: {
        namespaceId: namespace.id,
        tenantId,
        ...(body.statuses &&
          body.statuses.length > 0 && {
            status: { in: body.statuses },
          }),
      },
      orderBy: [
        {
          [body.orderBy]: body.order,
        },
      ],
      ...getPaginationArgs(body, "job_"),
    });

    const paginated = paginateResults(
      body,
      ingestJobs.map((job) =>
        IngestJobSchema.parse({
          ...job,
          id: prefixId(job.id, "job_"),
          namespaceId: prefixId(job.namespaceId, "ns_"),
        }),
      ),
    );

    return makeApiSuccessResponse({
      data: paginated.records,
      nextCursor: paginated.nextCursor,
      headers,
    });
  },
  { logging: { routeName: "GET /v1/namespace/[namespaceId]/ingest-jobs" } },
);

export const POST = withNamespaceApiHandler(
  async ({ req, namespace, tenantId, headers, organization }) => {
    // if it's not a pro plan, check if the user has exceeded the limit
    // pro plan is unlimited with usage based billing
    if (
      !isProPlan(organization.plan) &&
      organization.totalPages >= organization.pagesLimit
    ) {
      throw new AgentsetApiError({
        code: "rate_limit_exceeded",
        message: exceededLimitError({
          plan: organization.plan,
          limit: organization.pagesLimit,
          type: "pages",
        }),
      });
    }

    const body = await createIngestJobSchema.parseAsync(
      await parseRequestBody(req),
    );

    try {
      const job = await createIngestJob({
        data: body,
        namespaceId: namespace.id,
        tenantId,
      });

      return makeApiSuccessResponse({
        data: IngestJobSchema.parse({
          ...job,
          id: prefixId(job.id, "job_"),
          namespaceId: prefixId(job.namespaceId, "ns_"),
        }),
        headers,
        status: 201,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INVALID_PAYLOAD") {
          throw new AgentsetApiError({
            code: "bad_request",
            message: "Invalid payload",
          });
        }

        if (error.message === "FILE_NOT_FOUND") {
          throw new AgentsetApiError({
            code: "bad_request",
            message: "File not found",
          });
        }
      }

      throw error;
    }
  },
  { logging: { routeName: "POST /v1/namespace/[namespaceId]/ingest-jobs" } },
);
