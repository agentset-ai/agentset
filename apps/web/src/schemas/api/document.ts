import { z } from "zod/v4";

import { DocumentStatus } from "@agentset/db";
import {
  documentConfigSchema,
  // documentExternalIdSchema,
  documentPayloadSchema,
  documentPropertiesSchema,
} from "@agentset/validation";

import { csvToStringArray } from "../helpers";
import { paginationSchema } from "./pagination";

const nameSchema = z
  .string()
  .nullable()
  .default(null)
  .describe("The name of the document.");

export const DocumentStatusSchema = z
  .enum(DocumentStatus)
  .meta({ id: "document-status", description: "The status of the document." });

export const DocumentSchema = z
  .object({
    id: z.string().describe("The unique ID of the document."),
    ingestJobId: z.string().describe("The ingest job ID of the document."),
    // externalId: documentExternalIdSchema,
    name: nameSchema,
    tenantId: z
      .string()
      .nullable()
      .default(null)
      .describe("The tenant ID of the ingest job."),
    status: DocumentStatusSchema,
    error: z
      .string()
      .nullable()
      .default(null)
      .describe(
        "The error message of the document. Only exists when the status is failed.",
      ),
    source: documentPayloadSchema,
    properties: documentPropertiesSchema.nullable().default(null),
    config: documentConfigSchema.nullable().default(null),
    totalChunks: z.number().describe("The total number of chunks."),
    totalTokens: z.number().describe("The total number of tokens."),
    totalCharacters: z.number().describe("The total number of characters."),
    totalPages: z
      .number()
      .describe(
        "The total number of pages. Will be 0 if the document is not paged (e.g. PDF).",
      ),
    createdAt: z.date().describe("The date and time the document was created."),
    queuedAt: z
      .date()
      .nullable()
      .describe("The date and time the document was queued.")
      .default(null),
    preProcessingAt: z
      .date()
      .nullable()
      .describe("The date and time the document was pre-processed.")
      .default(null),
    processingAt: z
      .date()
      .nullable()
      .describe("The date and time the document was processed.")
      .default(null),
    completedAt: z
      .date()
      .nullable()
      .describe("The date and time the document was completed.")
      .default(null),
    failedAt: z
      .date()
      .nullable()
      .describe("The date and time the document failed.")
      .default(null),
  })
  .meta({
    id: "document",
    title: "Document",
  });

export const DocumentsQuerySchema = z.object({
  statuses: z
    .preprocess(csvToStringArray, z.array(DocumentStatusSchema))
    .describe("Comma separated list of statuses to filter by.")
    .meta({
      style: "form",
      explode: false,
    })
    .optional(),
  orderBy: z
    .enum(["createdAt"])
    .describe("The field to order by. Default is `createdAt`.")
    .optional()
    .default("createdAt"),
  order: z
    .enum(["asc", "desc"])
    .describe("The order to sort by. Default is `desc`.")
    .optional()
    .default("desc"),
  ingestJobId: z
    .string()
    .describe("The ingest job ID to filter documents by.")
    .optional(),
});

export const getDocumentsSchema = DocumentsQuerySchema.extend(
  paginationSchema.shape,
);
