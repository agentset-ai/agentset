import { z } from "zod/v4";

import { fileNameSchema } from "./utils";

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
