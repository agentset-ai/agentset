import { AgentsetApiError } from "@/lib/api/errors";
import {
  createIngestJobSchema,
  getIngestionJobsSchema,
  IngestJobSchema,
} from "@/schemas/api/ingest-job";
import { jobIdPathSchema, namespaceIdPathSchema } from "@/schemas/api/params";
import {
  api,
  protectedProcedure,
  requireNamespace,
  successSchema,
} from "@/server/orpc/base";
import { createIngestJob } from "@/services/ingest-jobs/create";
import { deleteIngestJob } from "@/services/ingest-jobs/delete";
import { reIngestJob } from "@/services/ingest-jobs/re-ingest";
import { getPaginationArgs, paginateResults } from "@/services/pagination";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { db } from "@agentset/db/client";
import { isFreePlan } from "@agentset/stripe/plans";
import { normalizeId, prefixId } from "@agentset/utils";

import { makeCodeSamples, ts } from "./code-samples";
import { getNamespaceByUser } from "./helpers";

const list = api
  .route({
    method: "GET",
    path: "/namespace/{namespaceId}/ingest-jobs",
    operationId: "listIngestJobs",
    summary: "Retrieve a list of ingest jobs",
    description:
      "Retrieve a paginated list of ingest jobs for the authenticated organization.",
    tags: ["Ingest Jobs"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "list",
      "x-speakeasy-group": "ingestJobs",
      "x-speakeasy-pagination": {
        type: "cursor",
        inputs: [
          {
            name: "cursor",
            in: "parameters",
            type: "cursor",
          },
        ],
        outputs: {
          nextCursor: "$.pagination.nextCursor",
        },
      },
      security: [{ token: [] }],
      ...makeCodeSamples(ts`
const jobs = await ns.ingestion.all();
console.log(jobs);
`),
    }),
  })
  .input(getIngestionJobsSchema.extend({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(z.array(IngestJobSchema), { hasPagination: true }))
  .handler(async ({ context, input }) => {
    const { where, ...paginationArgs } = getPaginationArgs(
      input,
      {
        orderBy: input.orderBy,
        order: input.order,
      },
      "job_",
    );

    const ingestJobs = await db.ingestJob.findMany({
      where: {
        namespaceId: context.namespace.id,
        tenantId: context.tenantId,
        ...(input.statuses &&
          input.statuses.length > 0 && {
            status: { in: input.statuses },
          }),
        ...where,
      },
      ...paginationArgs,
    });

    const paginated = paginateResults(
      input,
      ingestJobs.map((job) => ({
        ...job,
        id: prefixId(job.id, "job_"),
        namespaceId: prefixId(job.namespaceId, "ns_"),
      })),
    );

    return {
      success: true as const,
      data: paginated.records,
      pagination: paginated.pagination,
    };
  });

const create = api
  .route({
    method: "POST",
    path: "/namespace/{namespaceId}/ingest-jobs",
    successStatus: 201,
    operationId: "createIngestJob",
    summary: "Create an ingest job",
    description:
      "Create an ingest job for the authenticated organization. You can control how documents are parsed and chunked using the optional `config` object (for example, chunk size, overlap, language, and advanced OCR/LLM options).",
    tags: ["Ingest Jobs"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "create",
      "x-speakeasy-group": "ingestJobs",
      security: [{ token: [] }],
      ...makeCodeSamples(ts`
const job = await ns.ingestion.create({
  payload: {
    type: "TEXT",
    text: "This is some content to ingest into the knowledge base.",
  },
  config: {
    metadata: {
      foo: "bar",
    },
    chunkSize: 2048,
  },
});
console.log(job);
`),
    }),
  })
  .input(createIngestJobSchema.extend({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(IngestJobSchema))
  .handler(async ({ context, input }) => {
    const { namespaceId: _namespaceId, ...body } = input;

    if (
      isFreePlan(context.organization.plan) &&
      body.config?.mode === "accurate"
    ) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Accurate mode requires a pro subscription.",
      });
    }

    const job = await createIngestJob({
      data: body,
      organization: context.organization,
      namespaceId: context.namespace.id,
      tenantId: context.tenantId,
    });

    return {
      success: true as const,
      data: {
        ...job,
        id: prefixId(job.id, "job_"),
        namespaceId: prefixId(job.namespaceId, "ns_"),
      },
    };
  });

const get = api
  .route({
    method: "GET",
    path: "/namespace/{namespaceId}/ingest-jobs/{jobId}",
    operationId: "getIngestJobInfo",
    summary: "Retrieve an ingest job",
    description: "Retrieve the info for an ingest job.",
    tags: ["Ingest Jobs"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "get",
      "x-speakeasy-group": "ingestJobs",
      security: [{ token: [] }],
      ...makeCodeSamples(ts`
const job = await ns.ingestion.get("job_123");
console.log(job);
`),
    }),
  })
  .input(
    z.object({
      namespaceId: namespaceIdPathSchema,
      jobId: jobIdPathSchema,
    }),
  )
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(IngestJobSchema))
  .handler(async ({ context, input }) => {
    const jobId = normalizeId(input.jobId, "job_");
    if (!jobId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid job id",
      });
    }

    // note: deliberately not tenant-filtered (parity with the legacy route)
    const data = await db.ingestJob.findUnique({
      where: {
        id: jobId,
        namespaceId: context.namespace.id,
      },
    });

    if (!data) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Ingest job not found",
      });
    }

    return {
      success: true as const,
      data: {
        ...data,
        id: prefixId(data.id, "job_"),
        namespaceId: prefixId(data.namespaceId, "ns_"),
      },
    };
  });

const del = api
  .route({
    method: "DELETE",
    path: "/namespace/{namespaceId}/ingest-jobs/{jobId}",
    operationId: "deleteIngestJob",
    summary: "Delete an ingest job",
    description: "Delete an ingest job for the authenticated organization.",
    tags: ["Ingest Jobs"],
    // The legacy spec documents this soft delete under "204" even though the
    // route responds 200 with the queued-for-delete record; the central spec
    // post-processing renames the response key (see `@/server/orpc/spec`).
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "delete",
      "x-speakeasy-group": "ingestJobs",
      "x-speakeasy-max-method-params": 1,
      security: [{ token: [] }],
      ...makeCodeSamples(ts`
await ns.ingestion.delete("job_123");
console.log("Ingest job queued for deletion");
`),
    }),
  })
  .input(
    z.object({
      namespaceId: namespaceIdPathSchema,
      jobId: jobIdPathSchema,
    }),
  )
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(IngestJobSchema))
  .handler(async ({ context, input }) => {
    const jobId = normalizeId(input.jobId, "job_");
    if (!jobId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid job id",
      });
    }

    const data = await deleteIngestJob({
      jobId,
      namespaceId: context.namespace.id,
      organizationId: context.namespace.organizationId,
    });

    return {
      success: true as const,
      data: {
        ...data,
        id: prefixId(data.id, "job_"),
        namespaceId: prefixId(data.namespaceId, "ns_"),
      },
    };
  });

const reIngest = api
  .route({
    method: "POST",
    path: "/namespace/{namespaceId}/ingest-jobs/{jobId}/re-ingest",
    operationId: "reIngestJob",
    summary: "Re-ingest a job",
    description: "Re-ingest a job for the authenticated organization.",
    tags: ["Ingest Jobs"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "reIngest",
      "x-speakeasy-group": "ingestJobs",
      "x-speakeasy-max-method-params": 1,
      security: [{ token: [] }],
      ...makeCodeSamples(ts`
const result = await ns.ingestion.reIngest("job_123");
console.log("Job queued for re-ingestion: ", result);
`),
    }),
  })
  .input(
    z.object({
      namespaceId: namespaceIdPathSchema,
      jobId: jobIdPathSchema,
    }),
  )
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(IngestJobSchema.pick({ id: true })))
  .handler(async ({ context, input }) => {
    const jobId = normalizeId(input.jobId, "job_");
    if (!jobId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid job id",
      });
    }

    const job = await reIngestJob({
      jobId,
      namespaceId: context.namespace.id,
      organizationId: context.namespace.organizationId,
      plan: context.organization.plan,
    });

    return {
      success: true as const,
      data: { id: prefixId(job.id, "job_") },
    };
  });

/**
 * Dashboard-only slim list ({ records, pagination }, raw un-prefixed ids,
 * field subset). No `.route()` — stays off REST/OpenAPI/MCP.
 */
const all = protectedProcedure
  .input(getIngestionJobsSchema.extend({ namespaceId: z.string() }))
  .handler(async ({ context, input }) => {
    const namespace = await getNamespaceByUser(context, {
      id: input.namespaceId,
    });

    if (!namespace) {
      throw new ORPCError("NOT_FOUND");
    }

    const { where, ...paginationArgs } = getPaginationArgs(
      input,
      {
        orderBy: input.orderBy,
        order: input.order,
      },
      "job_",
    );

    const ingestJobs = await db.ingestJob.findMany({
      where: {
        namespaceId: input.namespaceId,
        ...(input.statuses &&
          input.statuses.length > 0 && {
            status: { in: input.statuses },
          }),
        ...where,
      },
      select: {
        id: true,
        status: true,
        name: true,
        tenantId: true,
        completedAt: true,
        failedAt: true,
        error: true,
        queuedAt: true,
        createdAt: true,
      },
      ...paginationArgs,
    });

    return paginateResults(input, ingestJobs);
  });

export const ingestJobsRouter = {
  all,
  list,
  create,
  get,
  delete: del,
  reIngest,
};
