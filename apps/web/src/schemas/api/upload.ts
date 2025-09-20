import {
  isContentTypeSupported,
  isFileExtensionSupported,
} from "@/services/uploads";
import { z } from "zod/v4";

import { MAX_UPLOAD_SIZE } from "@agentset/storage/constants";

export const uploadFileSchema = z.object({
  fileName: z
    .string()
    .min(1)
    .trim()
    .refine((fileName) => isFileExtensionSupported(fileName), {
      error: "Invalid file extension",
    })
    .describe("File name")
    .meta({
      examples: ["document.pdf"],
    }),
  contentType: z
    .string()
    .trim()
    .refine((contentType) => isContentTypeSupported(contentType), {
      error: "Invalid content type",
    })
    .describe("Content type")
    .meta({
      examples: ["application/pdf"],
    }),
  fileSize: z
    .number()
    .min(1)
    .max(MAX_UPLOAD_SIZE)
    .describe("File size in bytes")
    .meta({
      examples: [1024],
    }),
});

export const batchUploadSchema = z.object({
  files: z.array(uploadFileSchema).min(1).max(100),
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
