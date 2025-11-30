/**
 * Public API Ingest Jobs Router
 *
 * Handles ingest job operations for public API routes.
 */

import { AgentsetApiError, exceededLimitError } from "@/lib/api/errors";
import { normalizeId, prefixId } from "@/lib/api/ids";
import {
  createIngestJobSchema,
  getIngestionJobsSchema,
  IngestJobSchema,
} from "@/schemas/api/ingest-job";
import { apiSuccessSchema } from "@/schemas/api/response";
import { createIngestJob } from "@/services/ingest-jobs/create";
import { deleteIngestJob } from "@/services/ingest-jobs/delete";
import { getPaginationArgs, paginateResults } from "@/services/pagination";
import { createPublicContext } from "@/services/shared/create-public-context";
import { getNamespace as getNamespaceAccess } from "@/services/shared/namespace-access";
import { z } from "zod/v4";

import { IngestJobStatus, Prisma } from "@agentset/db";
import { triggerReIngestJob } from "@agentset/jobs";
import { isFreePlan } from "@agentset/stripe/plans";

import { publicApiProcedure } from "../orpc";

export const ingestJobsRouter = {
  /**
   * List ingest jobs
   */
  list: publicApiProcedure
    .route({ method: "GET", path: "/namespace/{namespaceId}/ingest-jobs" })
    .input(
      z
        .object({
          namespaceId: z.string(),
        })
        .extend(getIngestionJobsSchema.shape),
    )
    .output(
      apiSuccessSchema(
        z.object({
          records: z.array(IngestJobSchema),
          pagination: z.any(), // TODO: Use proper pagination schema
        }),
      ),
    )
    .handler(async ({ context, input }) => {
      const { namespaceId: rawNamespaceId, ...query } = input;
      const namespaceId = normalizeId(rawNamespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const { where, ...paginationArgs } = getPaginationArgs(
        query,
        {
          orderBy: query.orderBy,
          order: query.order,
        },
        "job_",
      );

      const ingestJobs = await context.db.ingestJob.findMany({
        where: {
          namespaceId: namespace.id,
          tenantId: context.tenantId,
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
        ingestJobs.map((job: (typeof ingestJobs)[number]) =>
          IngestJobSchema.parse({
            ...job,
            id: prefixId(job.id, "job_"),
            namespaceId: prefixId(job.namespaceId, "ns_"),
          }),
        ),
      );

      return {
        success: true,
        data: {
          records: paginated.records,
          pagination: paginated.pagination,
        },
      };
    }),

  /**
   * Create an ingest job
   */
  create: publicApiProcedure
    .route({
      method: "POST",
      path: "/namespace/{namespaceId}/ingest-jobs",
      successStatus: 201,
    })
    .input(
      z
        .object({
          namespaceId: z.string(),
        })
        .extend(createIngestJobSchema.shape),
    )
    .output(apiSuccessSchema(IngestJobSchema))
    .handler(async ({ context, input }) => {
      const { namespaceId: rawNamespaceId, ...body } = input;
      const namespaceId = normalizeId(rawNamespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      // Check rate limits for free plan
      if (
        isFreePlan(context.organization.plan) &&
        context.organization.totalPages >= context.organization.pagesLimit
      ) {
        throw new AgentsetApiError({
          code: "rate_limit_exceeded",
          message: exceededLimitError({
            plan: context.organization.plan,
            limit: context.organization.pagesLimit,
            type: "pages",
          }),
        });
      }

      // Check if free plan is trying to use accurate mode
      if (
        isFreePlan(context.organization.plan) &&
        body.config?.mode === "accurate"
      ) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Accurate mode requires a pro subscription.",
        });
      }

      try {
        const job = await createIngestJob(serviceContext, {
          namespaceId: namespace.id,
          tenantId: context.tenantId,
          data: body,
        });

        const data = IngestJobSchema.parse({
          ...job,
          id: prefixId(job.id, "job_"),
          namespaceId: prefixId(job.namespaceId, "ns_"),
        });
        return { success: true, data };
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
    }),

  /**
   * Get an ingest job by ID
   */
  get: publicApiProcedure
    .route({
      method: "GET",
      path: "/namespace/{namespaceId}/ingest-jobs/{jobId}",
    })
    .input(
      z.object({
        namespaceId: z.string(),
        jobId: z.string(),
      }),
    )
    .output(apiSuccessSchema(IngestJobSchema))
    .handler(async ({ context, input }) => {
      const namespaceId = normalizeId(input.namespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const jobId = normalizeId(input.jobId, "job_");
      if (!jobId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid job id",
        });
      }

      const data = await context.db.ingestJob.findUnique({
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

      const jobData = IngestJobSchema.parse({
        ...data,
        id: prefixId(data.id, "job_"),
        namespaceId: prefixId(data.namespaceId, "ns_"),
      });
      return { success: true, data: jobData };
    }),

  /**
   * Delete an ingest job
   */
  delete: publicApiProcedure
    .route({
      method: "DELETE",
      path: "/namespace/{namespaceId}/ingest-jobs/{jobId}",
    })
    .input(
      z.object({
        namespaceId: z.string(),
        jobId: z.string(),
      }),
    )
    .output(apiSuccessSchema(IngestJobSchema))
    .handler(async ({ context, input }) => {
      const namespaceId = normalizeId(input.namespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const jobId = normalizeId(input.jobId, "job_");
      if (!jobId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid job id",
        });
      }

      const ingestJob = await context.db.ingestJob.findUnique({
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

      const deletedJob = await deleteIngestJob(serviceContext, {
        jobId,
        namespaceId: namespace.id,
      });

      const data = IngestJobSchema.parse({
        ...deletedJob,
        id: prefixId(deletedJob.id, "job_"),
        namespaceId: prefixId(deletedJob.namespaceId, "ns_"),
      });
      return { success: true, data };
    }),

  /**
   * Re-ingest a job
   */
  reIngest: publicApiProcedure
    .route({
      method: "POST",
      path: "/namespace/{namespaceId}/ingest-jobs/{jobId}/re-ingest",
    })
    .input(
      z.object({
        namespaceId: z.string(),
        jobId: z.string(),
      }),
    )
    .output(apiSuccessSchema(z.object({ id: z.string() })))
    .handler(async ({ context, input }) => {
      const namespaceId = normalizeId(input.namespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const jobId = normalizeId(input.jobId, "job_");
      if (!jobId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid job id",
        });
      }

      const ingestJob = await context.db.ingestJob.findUnique({
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
        context.organization.plan,
      );

      await context.db.ingestJob.update({
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

      return { success: true, data: { id: prefixId(ingestJob.id, "job_") } };
    }),
};
