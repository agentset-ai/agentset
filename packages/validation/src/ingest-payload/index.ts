import { z } from "zod/v4";

// type IngestJobPayloadConnection = {
//   type: "CONNECTION";
//   connectionId: string;
// };

// type IngestJobPayloadS3 = {
//   type: "S3";
//   bucket: string;
//   prefix?: string;
//   fileTypes?: string[];
// };

// type IngestJobPayloadGoogleDrive = {
//   type: "GOOGLE_DRIVE";
//   folderId: string;
//   fileTypes?: string[];
// };

export const ingestJobNameSchema = z
  .string()
  .nullable()
  .optional()
  .describe("The name of the ingest job.");

export const configSchema = z
  .object({
    chunkSize: z.coerce.number().describe("Soft chunk size.").optional(),
    maxChunkSize: z.coerce.number().describe("Hard chunk size.").optional(),
    chunkOverlap: z.coerce
      .number()
      .describe("Custom chunk overlap.")
      .optional(),
    metadata: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .describe(
        "Custom metadata to be added to the ingested documents. It cannot contain nested objects; only primitive types (string, number, boolean) are allowed.",
      )
      .optional(),
    chunkingStrategy: z
      .enum(["basic", "by_title"])
      .meta({
        id: "chunking-strategy",
        description: "The chunking strategy to use. Defaults to `basic`.",
      })
      .optional(),
    strategy: z
      .enum(["auto", "fast", "hi_res", "ocr_only"])
      .meta({
        id: "strategy",
        description: "The strategy to use. Defaults to `auto`.",
      })
      .optional(),
    // languages: z.array(z.string()).optional().describe("The languages to use."),
  })
  .meta({ id: "ingest-job-config", description: "The ingest job config." });

export type IngestJobConfig = z.infer<typeof configSchema>;

const fileNameSchema = z
  .string()
  .describe("The name of the file.")
  .nullable()
  .optional();

// TODO: bring this back when we implement document external ID
// export const documentExternalIdSchema = z
//   .string()
//   .nullable()
//   .optional()
//   .describe(
//     "A unique external ID of the document. You can use this to identify the document in your system.",
//   );

export const textPayloadSchema = z
  .object({
    type: z.literal("TEXT"),
    text: z.string().describe("The text to ingest."),
    fileName: fileNameSchema,
    // externalId: documentExternalIdSchema,
  })
  .meta({
    id: "text-payload",
    title: "Text Payload",
  });

export const filePayloadSchema = z
  .object({
    type: z.literal("FILE"),
    fileUrl: z.string().describe("The URL of the file to ingest."),
    fileName: fileNameSchema,
    // externalId: documentExternalIdSchema,
  })
  .meta({
    id: "file-payload",
    title: "URL Payload",
  });

export const managedFilePayloadSchema = z
  .object({
    type: z.literal("MANAGED_FILE"),
    key: z.string().describe("The key of the managed file to ingest."),
    fileName: fileNameSchema,
    // externalId: documentExternalIdSchema,
  })
  .meta({
    id: "managed-file-payload",
    title: "Managed File Payload",
  });

export const batchPayloadSchema = z
  .object({
    type: z.literal("BATCH"),
    items: z
      .array(
        z.discriminatedUnion("type", [
          textPayloadSchema.extend({ config: configSchema.optional() }),
          filePayloadSchema.extend({ config: configSchema.optional() }),
          managedFilePayloadSchema.extend({ config: configSchema.optional() }),
        ]),
      )
      .describe("The items to ingest.")
      .min(1),
  })
  .meta({
    id: "batch-payload",
    title: "Batch Payload",
  });

export const ingestJobPayloadSchema = z
  .discriminatedUnion("type", [
    textPayloadSchema,
    filePayloadSchema,
    managedFilePayloadSchema,
    batchPayloadSchema,
  ])
  .meta({ id: "ingest-job-payload", description: "The ingest job payload." });

export type IngestJobPayload = z.infer<typeof ingestJobPayloadSchema>;
export type IngestJobBatchItem = z.infer<
  typeof batchPayloadSchema
>["items"][number];
