import { z } from "zod/v4";

import { baseConfigSchema } from "./config";

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

export const configSchema = baseConfigSchema.meta({
  id: "ingest-job-config",
  description: "The ingest job config.",
});

export type IngestJobConfig = z.infer<typeof configSchema>;

export const documentConfigSchema = baseConfigSchema.meta({
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

const crawlOptionsSchema = z
  .object({
    maxDepth: z.coerce
      .number()
      .int()
      .positive()
      .describe(
        "Maximum depth to follow links from the starting URL. Depth 1 means only the initial page.",
      )
      .optional(),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .describe(
        "Maximum number of pages to crawl before stopping. Helps bound large sites.",
      )
      .optional(),
    includePaths: z
      .array(z.string())
      .describe(
        "Only crawl URLs whose path matches at least one of these prefixes.",
      )
      .optional(),
    excludePaths: z
      .array(z.string())
      .describe("Never crawl URLs whose path matches these prefixes.")
      .optional(),
    headers: z
      .record(z.string(), z.string())
      .describe(
        "Custom HTTP headers to send with crawl requests (for example, auth headers).",
      )
      .optional(),
  })
  .meta({
    id: "crawl-options",
    description: "Options to control how the crawl behaves.",
  });

const crawlPayloadSchema = z
  .object({
    type: z.literal("CRAWL"),
    url: z.url().describe("The starting URL to crawl."),
    options: crawlOptionsSchema
      .describe("Optional crawl configuration.")
      .optional(),
  })
  .meta({
    id: "crawl-payload",
    title: "Crawl Payload",
  });

const youtubeOptionsSchema = z
  .object({
    transcriptLanguages: z
      .array(z.string())
      .describe(
        "We will try to fetch the first available transcript in the given languages. Default is `en`.",
      )
      .optional(),
  })
  .meta({
    id: "youtube-options",
    description: "Options to control how the youtube ingestion behaves.",
  });

const youtubePayloadSchema = z
  .object({
    type: z.literal("YOUTUBE"),
    urls: z
      .array(z.url().startsWith("https://www.youtube.com/"))
      .describe("The URLs of videos, channels, or playlists to ingest."),
    options: youtubeOptionsSchema.optional(),
  })
  .meta({
    id: "youtube-payload",
    title: "Youtube Payload",
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
    crawlPayloadSchema,
    youtubePayloadSchema,
    batchPayloadSchema,
  ])
  .meta({ id: "ingest-job-payload", description: "The ingest job payload." });

// Schema for creating new jobs (strict validation)
export const ingestJobPayloadInputSchema = z
  .discriminatedUnion("type", [
    textPayloadInputSchema,
    filePayloadSchema,
    managedFilePayloadSchema,
    crawlPayloadSchema,
    youtubePayloadSchema,
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
