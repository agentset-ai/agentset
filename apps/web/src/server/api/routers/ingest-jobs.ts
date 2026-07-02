import {
  createIngestJobSchema,
  getIngestionJobsSchema,
} from "@/schemas/api/ingest-job";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createIngestJob } from "@/services/ingest-jobs/create";
import { deleteIngestJob } from "@/services/ingest-jobs/delete";
import { reIngestJob } from "@/services/ingest-jobs/re-ingest";
import { getPaginationArgs, paginateResults } from "@/services/pagination";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { getNamespaceByUser } from "../auth";

export const ingestJobRouter = createTRPCRouter({
  all: protectedProcedure
    .input(getIngestionJobsSchema.extend({ namespaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const namespace = await getNamespaceByUser(ctx, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const { where, ...paginationArgs } = getPaginationArgs(
        input,
        {
          orderBy: input.orderBy,
          order: input.order,
        },
        "job_",
      );

      const ingestJobs = await ctx.db.ingestJob.findMany({
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
    }),
  getConfig: protectedProcedure
    .input(z.object({ jobId: z.string(), namespaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const namespace = await getNamespaceByUser(ctx, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const ingestJob = await ctx.db.ingestJob.findUnique({
        where: {
          id: input.jobId,
          namespaceId: namespace.id,
        },
        select: {
          config: true,
        },
      });

      if (!ingestJob) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ingestJob.config;
    }),
  ingest: protectedProcedure
    .input(
      createIngestJobSchema.extend({
        namespaceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { namespaceId, ...input } }) => {
      const namespace = await getNamespaceByUser(ctx, {
        id: namespaceId,
      });

      if (!namespace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const organization = await ctx.db.organization.findUnique({
        where: { id: namespace.organizationId },
      });

      if (!organization) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return await createIngestJob({
        data: input,
        organization,
        namespaceId: namespace.id,
      });
    }),
  delete: protectedProcedure
    .input(z.object({ jobId: z.string(), namespaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const namespace = await getNamespaceByUser(ctx, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return await deleteIngestJob({
        jobId: input.jobId,
        namespaceId: namespace.id,
        organizationId: namespace.organizationId,
      });
    }),
  reIngest: protectedProcedure
    .input(z.object({ jobId: z.string(), namespaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const namespace = await getNamespaceByUser(ctx, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // the service fetches the org plan in parallel with the job lookup
      return await reIngestJob({
        jobId: input.jobId,
        namespaceId: namespace.id,
        organizationId: namespace.organizationId,
      });
    }),
});
