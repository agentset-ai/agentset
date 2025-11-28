import { z } from "zod/v4";

import { baseConfigSchema } from "./config";
import { filePayloadSchema } from "./file";
import { managedFilePayloadSchema } from "./managed-file";
import { textPayloadInputSchema, textPayloadSchema } from "./text";

export const documentConfigSchema = baseConfigSchema.meta({
  id: "document-config",
  description: "The document config.",
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
