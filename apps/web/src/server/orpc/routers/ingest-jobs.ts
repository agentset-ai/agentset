/**
 * Ingest Jobs Router
 *
 * Handles document ingestion job operations.
 */

import {
  createIngestJobSchema,
  getIngestionJobsSchema,
} from "@/schemas/api/ingest-job";
import { protectedProcedure } from "@/server/orpc/orpc";
import { createIngestJob } from "@/services/ingest-jobs/create";
import { deleteIngestJob } from "@/services/ingest-jobs/delete";
import { getAllIngestJobs } from "@/services/ingest-jobs/getAll";
import { getIngestJobConfig } from "@/services/ingest-jobs/getConfig";
import { reIngestJob } from "@/services/ingest-jobs/reIngest";
import { toProtectedAgentsetContext } from "@/services/shared/adapters";
import { z } from "zod/v4";

export const ingestJobRouter = {
  all: protectedProcedure
    .input(getIngestionJobsSchema.extend({ namespaceId: z.string() }))
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getAllIngestJobs(serviceContext, input);
    }),
  getConfig: protectedProcedure
    .input(z.object({ jobId: z.string(), namespaceId: z.string() }))
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getIngestJobConfig(serviceContext, input);
    }),
  ingest: protectedProcedure
    .input(
      createIngestJobSchema.extend({
        namespaceId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      const { namespaceId, ...data } = input;
      return await createIngestJob(serviceContext, {
        namespaceId,
        data,
      });
    }),
  delete: protectedProcedure
    .input(z.object({ jobId: z.string(), namespaceId: z.string() }))
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await deleteIngestJob(serviceContext, input);
    }),
  reIngest: protectedProcedure
    .input(z.object({ jobId: z.string(), namespaceId: z.string() }))
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await reIngestJob(serviceContext, input);
    }),
};
