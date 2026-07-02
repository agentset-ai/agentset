import { AgentsetApiError } from "@/lib/api/errors";
import { resolveNamespace, runTool } from "@/lib/mcp/run-tool";
import { namespaceIdSchema } from "@/lib/mcp/schemas";
import {
  createIngestJobSchema,
  IngestJobSchema,
} from "@/schemas/api/ingest-job";
import { paginationSchema } from "@/schemas/api/pagination";
import { batchUploadSchema, UploadResultSchema } from "@/schemas/api/upload";
import { createIngestJob } from "@/services/ingest-jobs/create";
import { deleteIngestJob } from "@/services/ingest-jobs/delete";
import { reIngestJob } from "@/services/ingest-jobs/re-ingest";
import { getPaginationArgs, paginateResults } from "@/services/pagination";
import { createBatchUpload } from "@/services/uploads";
import { z } from "zod/v4";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IngestJob } from "@agentset/db";
import { IngestJobStatusSchema } from "@agentset/db";
import { db } from "@agentset/db/client";
import { isFreePlan } from "@agentset/stripe/plans";
import { normalizeId, prefixId } from "@agentset/utils";

const jobIdSchema = z
  .string()
  .describe("The ID of the ingest job (e.g. `job_xxx`).");

const toIngestJobResponse = (job: IngestJob) =>
  IngestJobSchema.parse({
    ...job,
    id: prefixId(job.id, "job_"),
    namespaceId: prefixId(job.namespaceId, "ns_"),
  });

const normalizeJobId = (rawJobId: string) => {
  const jobId = normalizeId(rawJobId, "job_");
  if (!jobId) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Invalid job id",
    });
  }

  return jobId;
};

export const registerIngestionTools = (server: McpServer) => {
  server.registerTool(
    "create_upload_urls",
    {
      title: "Create upload URLs",
      description:
        "Create presigned upload URLs for one or more files (two-step upload flow, step 1). For each file you get back a `url` and a `key`: make an HTTP PUT request to the `url` with the raw file bytes as the body and the same `Content-Type` header you declared here, then pass the `key` in a `MANAGED_FILE` payload to create_ingest_job (step 2). URLs expire, so upload promptly.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        files: batchUploadSchema.shape.files.describe(
          "The files to create upload URLs for (1-100).",
        ),
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);

        const result = await createBatchUpload({
          namespaceId: namespace.id,
          files: args.files,
        });

        if (!result.success) {
          throw new AgentsetApiError({
            code: "internal_server_error",
            message: result.error,
          });
        }

        return z.array(UploadResultSchema).parse(result.data);
      }),
  );

  server.registerTool(
    "create_ingest_job",
    {
      title: "Create ingest job",
      description:
        "Ingest content into a namespace so it becomes searchable. Payload variants: `TEXT` (raw text), `FILE` (a publicly accessible fileUrl), `MANAGED_FILE` (a key from create_upload_urls after PUT-ing the file), `CRAWL` (a website URL), `YOUTUBE` (a video URL), or `BATCH` (a list of FILE/MANAGED_FILE items). Ingestion is asynchronous: poll get_ingest_job until the status is COMPLETED before searching. If a tenant is set via the x-tenant-id header, the documents are partitioned to that tenant.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        ...createIngestJobSchema.shape,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const { namespaceId: _namespaceId, ...body } = args;

        if (isFreePlan(ctx.organization.plan) && body.config?.mode === "accurate") {
          throw new AgentsetApiError({
            code: "bad_request",
            message: "Accurate mode requires a pro subscription.",
          });
        }

        const job = await createIngestJob({
          data: body,
          organization: {
            id: ctx.organizationId,
            plan: ctx.organization.plan,
            totalPages: ctx.organization.totalPages,
            pagesLimit: ctx.organization.pagesLimit,
          },
          namespaceId: namespace.id,
          tenantId: ctx.tenantId,
        });

        return toIngestJobResponse(job);
      }),
  );

  server.registerTool(
    "list_ingest_jobs",
    {
      title: "List ingest jobs",
      description:
        "List the ingest jobs of a namespace with cursor pagination. Pass the returned `pagination.nextCursor` as `cursor` to fetch the next page. Optionally filter by statuses.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        statuses: z
          .array(IngestJobStatusSchema)
          .optional()
          .describe("Statuses to filter by."),
        orderBy: z.enum(["createdAt"]).optional().default("createdAt"),
        order: z.enum(["asc", "desc"]).optional().default("desc"),
        ...paginationSchema.shape,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);

        const { where, ...paginationArgs } = getPaginationArgs(
          args,
          {
            orderBy: args.orderBy,
            order: args.order,
          },
          "job_",
        );

        const ingestJobs = await db.ingestJob.findMany({
          where: {
            namespaceId: namespace.id,
            tenantId: ctx.tenantId,
            ...(args.statuses &&
              args.statuses.length > 0 && {
                status: { in: args.statuses },
              }),
            ...where,
          },
          ...paginationArgs,
        });

        const paginated = paginateResults(
          args,
          ingestJobs.map(toIngestJobResponse),
        );

        return {
          records: paginated.records,
          pagination: paginated.pagination,
        };
      }),
  );

  server.registerTool(
    "get_ingest_job",
    {
      title: "Get ingest job",
      description:
        "Get an ingest job by ID, including its status (QUEUED, PRE_PROCESSING, PROCESSING, COMPLETED, FAILED, ...) and error message if it failed. Poll this after create_ingest_job until the status is COMPLETED.",
      inputSchema: { namespaceId: namespaceIdSchema, jobId: jobIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const jobId = normalizeJobId(args.jobId);

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

        return toIngestJobResponse(data);
      }),
  );

  server.registerTool(
    "delete_ingest_job",
    {
      title: "Delete ingest job",
      description:
        "Delete an ingest job and all documents it created. Deletion is asynchronous — the job status transitions to QUEUED_FOR_DELETE.",
      inputSchema: { namespaceId: namespaceIdSchema, jobId: jobIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const jobId = normalizeJobId(args.jobId);

        const data = await deleteIngestJob({
          jobId,
          namespaceId: namespace.id,
          organizationId: namespace.organizationId,
        });

        return toIngestJobResponse(data);
      }),
  );

  server.registerTool(
    "reingest_job",
    {
      title: "Re-ingest job",
      description:
        "Re-run an existing ingest job (e.g. after a failure or to refresh crawled content). The job must not currently be processing or deleting. Poll get_ingest_job for the new status.",
      inputSchema: { namespaceId: namespaceIdSchema, jobId: jobIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const jobId = normalizeJobId(args.jobId);

        const job = await reIngestJob({
          jobId,
          namespaceId: namespace.id,
          organizationId: namespace.organizationId,
          plan: ctx.organization.plan,
        });

        return { id: prefixId(job.id, "job_") };
      }),
  );
};
