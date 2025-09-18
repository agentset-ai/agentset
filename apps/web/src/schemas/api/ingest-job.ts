import { z } from "zod/v4";

import { IngestJobStatus } from "@agentset/db";
import {
  configSchema,
  ingestJobNameSchema,
  ingestJobPayloadSchema,
} from "@agentset/validation";

import { paginationSchema } from "./pagination";

export const IngestJobStatusSchema = z
  .enum(IngestJobStatus)
  .describe("The status of the ingest job.");

const externalIdSchema = z
  .string()
  .nullable()
  .default(null)
  .describe(
    "A unique external ID of the ingest job. You can use this to identify the ingest job in your system.",
  );

export const IngestJobSchema = z
  .object({
    id: z.string().describe("The unique ID of the ingest job."),
    name: ingestJobNameSchema,
    namespaceId: z.string().describe("The namespace ID of the ingest job."),
    tenantId: z
      .string()
      .nullable()
      .default(null)
      .describe("The tenant ID of the ingest job."),
    externalId: externalIdSchema,
    status: IngestJobStatusSchema,
    error: z
      .string()
      .nullable()
      .default(null)
      .describe(
        "The error message of the ingest job. Only exists when the status is failed.",
      ),
    payload: ingestJobPayloadSchema,
    config: configSchema.nullable().default(null),
    createdAt: z
      .date()
      .describe("The date and time the namespace was created."),
    queuedAt: z
      .date()
      .nullable()
      .describe("The date and time the ingest job was queued.")
      .default(null),
    preProcessingAt: z
      .date()
      .nullable()
      .describe("The date and time the ingest job was pre-processed.")
      .default(null),
    processingAt: z
      .date()
      .nullable()
      .describe("The date and time the ingest job was processed.")
      .default(null),
    completedAt: z
      .date()
      .nullable()
      .describe("The date and time the ingest job was completed.")
      .default(null),
    failedAt: z
      .date()
      .nullable()
      .describe("The date and time the ingest job failed.")
      .default(null),
  })
  .meta({
    title: "Ingest Job",
  });

export const IngestJobsQuerySchema = z.object({
  statuses: z
    .string()
    .transform((val) => val.split(","))
    .pipe(z.array(IngestJobStatusSchema))
    .optional()
    .describe("Comma separated list of statuses to filter by."),
  orderBy: z
    .enum(["createdAt"])
    .optional()
    .default("createdAt")
    .describe("The field to order by. Default is `createdAt`."),
  order: z
    .enum(["asc", "desc"])
    .optional()
    .default("desc")
    .describe("The sort order. Default is `desc`."),
});

export const getIngestionJobsSchema = IngestJobsQuerySchema.extend(
  paginationSchema.shape,
);

export const createIngestJobSchema = z.object({
  name: ingestJobNameSchema,
  payload: ingestJobPayloadSchema,
  config: configSchema.optional(),
  externalId: externalIdSchema,
});
