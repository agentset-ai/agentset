import { z } from "zod/v4";

import { fileNameSchema } from "./utils";

// Base schema for reading existing jobs (lenient validation)
const textPayloadBaseSchema = z.object({
  type: z.literal("TEXT"),
  fileName: fileNameSchema,
  // externalId: documentExternalIdSchema,
});

// Schema for creating new jobs (strict validation)
export const textPayloadInputSchema = textPayloadBaseSchema
  .extend({
    text: z.string().min(1).describe("The text to ingest."),
  })
  .meta({
    id: "text-payload-input",
    title: "Text Payload",
  });

// Schema for reading existing jobs (used for validation when querying)
export const textPayloadSchema = textPayloadBaseSchema
  .extend({
    text: z.string().describe("The text to ingest."),
  })
  .meta({
    id: "text-payload",
    title: "Text Payload",
  });
