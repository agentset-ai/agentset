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

import { Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";
import { isFreePlan } from "@agentset/stripe/plans";

export const GET = withNamespaceApiHandler(
  async ({ searchParams, namespace, tenantId, headers }) => {
    const query = await getIngestionJobsSchema.parseAsync(searchParams);

    const { where, ...paginationArgs } = getPaginationArgs(
      query,
      {
        orderBy: query.orderBy,
        order: query.order,
      },
      "job_",
    );

    const ingestJobs = await db.ingestJob.findMany({
      where: {
        namespaceId: namespace.id,
        tenantId,
        ...(query.statuses &&
          query.statuses.length > 0 && {
            status: { in: query.statuses },
          }),
        ...where,
      },
      ...paginationArgs,
    });

    const paginated = paginateResults(
      query,
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
      pagination: paginated.pagination,
      headers,
    });
  },
  { logging: { routeName: "GET /v1/namespace/[namespaceId]/ingest-jobs" } },
);

export const POST = withNamespaceApiHandler(
  async ({ req, namespace, tenantId, headers, organization }) => {
    // if it's not a pro plan, check if the user has exceeded the limit
    // pro plan is unlimited with usage based billing
    const isFreeOrg = isFreePlan(organization.plan);
    if (isFreeOrg && organization.totalPages >= organization.pagesLimit) {
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

    if (isFreeOrg && body.config?.mode === "accurate") {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Accurate mode requires a pro subscription.",
      });
    }

    try {
      const job = await createIngestJob({
        data: body,
        namespaceId: namespace.id,
        tenantId,
        plan: organization.plan,
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AgentsetApiError({
          code: "conflict",
          message: `The external ID "${body.externalId}" is already in use.`,
        });
      }

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
