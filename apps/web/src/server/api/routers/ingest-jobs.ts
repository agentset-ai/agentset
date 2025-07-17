import { isProPlan } from "@/lib/plans";
import { triggerReIngestJob } from "@/lib/workflow";
import {
  createIngestJobSchema,
  getIngestionJobsSchema,
} from "@/schemas/api/ingest-job";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createIngestJob } from "@/services/ingest-jobs/create";
import { deleteIngestJob } from "@/services/ingest-jobs/delete";
import { getPaginationArgs, paginateResults } from "@/services/pagination";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { IngestJobStatus } from "@agentset/db";

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

      const ingestJobs = await ctx.db.ingestJob.findMany({
        where: {
          namespaceId: input.namespaceId,
          ...(input.statuses &&
            input.statuses.length > 0 && {
              status: { in: input.statuses },
            }),
        },
        orderBy: [
          {
            [input.orderBy]: input.order,
          },
        ],
        ...getPaginationArgs(input),
      });

      return paginateResults(input, ingestJobs);
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

      // if it's not a pro plan, check if the user has exceeded the limit
      // pro plan is unlimited with usage based billing
      if (
        !isProPlan(organization.plan) &&
        organization.totalPages >= organization.pagesLimit
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You've reached the maximum number of pages.",
        });
      }

      return await createIngestJob({
        data: input,
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

      const ingestJob = await ctx.db.ingestJob.findUnique({
        where: {
          id: input.jobId,
          namespaceId: namespace.id,
        },
        select: { id: true, status: true },
      });

      if (!ingestJob) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (
        ingestJob.status === IngestJobStatus.QUEUED_FOR_DELETE ||
        ingestJob.status === IngestJobStatus.DELETING
      ) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const updatedIngestJob = await deleteIngestJob(ingestJob.id);

      return updatedIngestJob;
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

      const ingestJob = await ctx.db.ingestJob.findUnique({
        where: {
          id: input.jobId,
          namespaceId: namespace.id,
        },
        select: { id: true, status: true },
      });

      if (!ingestJob) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (
        ingestJob.status === IngestJobStatus.PRE_PROCESSING ||
        ingestJob.status === IngestJobStatus.PROCESSING
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Job is already being processed",
        });
      }

      const { workflowRunId } = await triggerReIngestJob({
        jobId: ingestJob.id,
      });

      await ctx.db.ingestJob.update({
        where: { id: ingestJob.id },
        data: {
          status: IngestJobStatus.QUEUED_FOR_RESYNC,
          queuedAt: new Date(),
          workflowRunsIds: { push: workflowRunId },
        },
        select: { id: true },
      });

      return ingestJob;
    }),
});
