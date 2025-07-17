import z from "../zod";

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
    chunkSize: z.coerce.number().optional().describe("Soft chunk size."),
    maxChunkSize: z.coerce.number().optional().describe("Hard chunk size."),
    chunkOverlap: z.coerce
      .number()
      .optional()
      .describe("Custom chunk overlap."),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Custom metadata to be added to the ingested documents."),
    chunkingStrategy: z
      .enum(["basic", "by_title"])
      .optional()
      .describe("The chunking strategy to use. Defaults to `basic`."),
    strategy: z
      .enum(["auto", "fast", "hi_res", "ocr_only"])
      .optional()
      .describe("The strategy to use. Defaults to `auto`."),
    // languages: z.array(z.string()).optional().describe("The languages to use."),
  })
  .describe("The ingest job config.");

export type IngestJobConfig = z.infer<typeof configSchema>;

const fileNameSchema = z
  .string()
  .nullable()
  .optional()
  .describe("The name of the file.");

export const textPayloadSchema = z
  .object({
    type: z.literal("TEXT"),
    text: z.string().describe("The text to ingest."),
    fileName: fileNameSchema,
  })
  .openapi({
    title: "Text Payload",
  });

export const filePayloadSchema = z
  .object({
    type: z.literal("FILE"),
    fileUrl: z.string().describe("The URL of the file to ingest."),
    fileName: fileNameSchema,
  })
  .openapi({
    title: "URL Payload",
  });

export const managedFilePayloadSchema = z
  .object({
    type: z.literal("MANAGED_FILE"),
    key: z.string().describe("The key of the managed file to ingest."),
    fileName: fileNameSchema,
  })
  .openapi({
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
      .min(1)
      .describe("The items to ingest."),
  })
  .openapi({
    title: "Batch Payload",
  });

export const ingestJobPayloadSchema = z
  .discriminatedUnion("type", [
    textPayloadSchema,
    filePayloadSchema,
    managedFilePayloadSchema,
    batchPayloadSchema,
  ])
  .describe("The ingest job payload.");

export type IngestJobPayload = z.infer<typeof ingestJobPayloadSchema>;
export type IngestJobBatchItem = z.infer<
  typeof batchPayloadSchema
>["items"][number];
