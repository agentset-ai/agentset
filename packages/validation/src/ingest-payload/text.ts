import { z } from "zod/v4";

import { fileNameSchema } from "./utils";

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
