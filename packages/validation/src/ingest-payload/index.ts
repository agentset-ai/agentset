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

const languageCode = z.enum([
  "af",
  "am",
  "ar",
  "bg",
  "bn",
  "ca",
  "cs",
  "cy",
  "da",
  "de",
  "en",
  "es",
  "et",
  "fa",
  "fi",
  "fr",
  "ga",
  "gl",
  "he",
  "hi",
  "hr",
  "hu",
  "id",
  "is",
  "it",
  "jp",
  "kr",
  "lt",
  "lv",
  "mk",
  "ms",
  "mt",
  "ne",
  "nl",
  "no",
  "pl",
  "pt",
  "pt-BR",
  "ro",
  "ru",
  "sk",
  "sl",
  "sr",
  "sv",
  "sw",
  "ta",
  "te",
  "th",
  "tl",
  "tr",
  "uk",
  "ur",
  "vi",
  "zh",
  "zu",
]);

const baseConfigSchema = z.object({
  chunkSize: z.coerce
    .number()
    .describe(
      "Chunk size (in characters). Controls approximately how much text is included in each chunk.",
    )
    .optional(),
  chunkOverlap: z.coerce
    .number()
    .describe(
      "Custom chunk overlap (in characters) between consecutive chunks. Helps preserve context across chunk boundaries.",
    )
    .optional(),

  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .describe(
      "Custom metadata to be added to the ingested documents. It cannot contain nested objects; only primitive types (string, number, boolean) are allowed.",
    )
    .optional(),

  languageCode: languageCode
    .describe(
      "Language code to use for text processing (for example, `en`, `fr`, or `pt-BR`). When omitted, the partition API will attempt to detect the language automatically.",
    )
    .optional(),
  forceOcr: z
    .boolean()
    .describe(
      "Force OCR on the document even if selectable text exists. Useful for scanned documents with unreliable embedded text.",
    )
    .optional(),
  mode: z
    .enum(["fast", "balanced", "accurate"])
    .meta({
      id: "mode",
      description:
        "Processing mode for the parser. `fast` favors speed, `accurate` favors quality and layout fidelity, and `balanced` offers a compromise between the two.",
    })
    .optional(),
  disableImageExtraction: z
    .boolean()
    .describe(
      "Disable image extraction from the document. When combined with `useLlm`, images may still be automatically captioned by the partition API.",
    )
    .optional(),
  disableOcrMath: z
    .boolean()
    .describe(
      "Disable inline math recognition in OCR. This can be useful if the document contains content that is frequently misclassified as math.",
    )
    .optional(),
  useLlm: z
    .boolean()
    .describe(
      "Enable LLM-assisted parsing to improve tables, forms, inline math, and layout detection. May increase latency and token usage.",
    )
    .optional(),

  // DEPRECATED PARAMS
  /**
   * @deprecated Use `chunkSize` instead.
   */
  maxChunkSize: z.coerce
    .number()
    .meta({
      description:
        "[Deprecated] Hard chunk size. This option is ignored by the current partition pipeline and kept only for backwards compatibility.",
      deprecated: true,
      "x-speakeasy-deprecation-message":
        "We no longer support this option. Use `chunkSize` instead.",
    })
    .optional(),

  /**
   * @deprecated Use `chunkingStrategy` instead.
   */
  chunkingStrategy: z
    .enum(["basic", "by_title"])
    .meta({
      id: "chunking-strategy",
      description:
        "[Deprecated] The legacy chunking strategy. This option is ignored by the current partition pipeline and kept only for backwards compatibility.",
      deprecated: true,
      "x-speakeasy-deprecation-message": "We no longer support this option.",
    })
    .optional(),

  /**
   * @deprecated Use `mode` instead.
   */
  strategy: z
    .enum(["auto", "fast", "hi_res", "ocr_only"])
    .meta({
      id: "strategy",
      description:
        "[Deprecated] Legacy processing strategy used by the previous partition API. This option is ignored by the current pipeline and kept only for backwards compatibility.",
      deprecated: true,
      "x-speakeasy-deprecation-message":
        "We no longer support this option. Use `mode` instead.",
    })
    .optional(),
});

export const configSchema = baseConfigSchema.meta({
  id: "ingest-job-config",
  description: "The ingest job config.",
});

export type IngestJobConfig = z.infer<typeof configSchema>;

export const documentConfigSchema = configSchema.meta({
  id: "document-config",
  description: "The document config.",
});

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

// Base schema for reading existing jobs (lenient validation)
const textPayloadBaseSchema = z
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

// Schema for creating new jobs (strict validation)
export const textPayloadInputSchema = textPayloadBaseSchema.extend({
  text: z.string().min(1).describe("The text to ingest."),
});

// Schema for reading existing jobs (used for validation when querying)
export const textPayloadSchema = textPayloadBaseSchema;

export const filePayloadSchema = z
  .object({
    type: z.literal("FILE"),
    fileUrl: z.url().describe("The URL of the file to ingest."),
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

// Schema for reading existing batch jobs (lenient validation)
export const batchPayloadSchema = z
  .object({
    type: z.literal("BATCH"),
    items: z
      .array(
        z.discriminatedUnion("type", [
          textPayloadSchema.extend({ config: documentConfigSchema.optional() }),
          filePayloadSchema.extend({ config: documentConfigSchema.optional() }),
          managedFilePayloadSchema.extend({
            config: documentConfigSchema.optional(),
          }),
        ]),
      )
      .describe("The items to ingest.")
      .min(1),
  })
  .meta({
    id: "batch-payload",
    title: "Batch Payload",
  });

// Schema for creating new batch jobs (strict validation)
export const batchPayloadInputSchema = z
  .object({
    type: z.literal("BATCH"),
    items: z
      .array(
        z.discriminatedUnion("type", [
          textPayloadInputSchema.extend({
            config: documentConfigSchema.optional(),
          }),
          filePayloadSchema.extend({ config: documentConfigSchema.optional() }),
          managedFilePayloadSchema.extend({
            config: documentConfigSchema.optional(),
          }),
        ]),
      )
      .describe("The items to ingest.")
      .min(1),
  })
  .meta({
    id: "batch-payload-input",
    title: "Batch Payload Input",
  });

// Schema for reading existing jobs (lenient validation)
export const ingestJobPayloadSchema = z
  .discriminatedUnion("type", [
    textPayloadSchema,
    filePayloadSchema,
    managedFilePayloadSchema,
    batchPayloadSchema,
  ])
  .meta({ id: "ingest-job-payload", description: "The ingest job payload." });

// Schema for creating new jobs (strict validation)
export const ingestJobPayloadInputSchema = z
  .discriminatedUnion("type", [
    textPayloadInputSchema,
    filePayloadSchema,
    managedFilePayloadSchema,
    batchPayloadInputSchema,
  ])
  .meta({
    id: "ingest-job-payload-input",
    description: "The ingest job payload for creation.",
  });

export type IngestJobPayload = z.infer<typeof ingestJobPayloadSchema>;
export type IngestJobPayloadInput = z.infer<typeof ingestJobPayloadInputSchema>;
export type IngestJobBatchItem = z.infer<
  typeof batchPayloadSchema
>["items"][number];
