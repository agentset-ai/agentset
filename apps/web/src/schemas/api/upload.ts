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
  url: z.url(),
  key: z.string(),
});
