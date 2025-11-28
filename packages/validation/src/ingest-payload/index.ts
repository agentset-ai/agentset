import { z } from "zod/v4";

import { batchPayloadInputSchema, batchPayloadSchema } from "./batch";
import { baseConfigSchema } from "./config";
import { crawlPayloadSchema } from "./crawl";
import { filePayloadSchema } from "./file";
import { managedFilePayloadSchema } from "./managed-file";
import { textPayloadInputSchema, textPayloadSchema } from "./text";
import { youtubePayloadSchema } from "./youtube";

export * from "./batch";
export * from "./crawl";
export * from "./file";
export * from "./managed-file";
export * from "./text";
export * from "./youtube";

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

// TODO: bring this back when we implement document external ID
// export const documentExternalIdSchema = z
//   .string()
//   .nullable()
//   .optional()
//   .describe(
//     "A unique external ID of the document. You can use this to identify the document in your system.",
//   );

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
