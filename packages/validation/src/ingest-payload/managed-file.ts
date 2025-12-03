import { z } from "zod/v4";

import { fileNameSchema } from "./utils";

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
