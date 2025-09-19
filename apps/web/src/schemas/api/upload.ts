import { z } from "zod/v4";

import { MAX_UPLOAD_SIZE } from "@agentset/storage/constants";

export const uploadFileSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  contentType: z.string().min(1, "Content type is required"),
  fileSize: z
    .number()
    .min(1, "File size must be greater than 0")
    .max(
      MAX_UPLOAD_SIZE,
      `File size must be less than ${MAX_UPLOAD_SIZE} bytes`,
    ),
});

export const batchUploadSchema = z.object({
  files: z
    .array(uploadFileSchema)
    .min(1, "At least one file is required")
    .max(100, "Maximum 100 files allowed"),
});

export const UploadResultSchema = z.object({
  url: z
    .url()
    .describe(
      "Presigned URL for file upload. Make a `PUT` request to this URL with the file content and the `Content-Type` header.",
    ),
  key: z
    .string()
    .describe(
      "Key of the file in the storage. You'll send this in the `MANAGED_FILE` payload when creating an ingest job.",
    ),
});
