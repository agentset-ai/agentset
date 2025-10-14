import {
  isContentTypeSupported,
  isFileExtensionSupported,
} from "@/services/uploads";
import { z } from "zod/v4";

import { MAX_UPLOAD_SIZE } from "@agentset/storage/constants";

export const uploadFileSchema = z
  .object({
    fileName: z
      .string()
      .meta({
        description: "File name",
        examples: ["document.pdf"],
      })
      .min(1)
      .trim()
      .refine((fileName) => isFileExtensionSupported(fileName), {
        error: "Invalid file extension",
      }),
    contentType: z
      .string()
      .meta({
        description: "Content type",
        examples: ["application/pdf"],
      })
      .trim()
      .refine((contentType) => isContentTypeSupported(contentType), {
        error: "Invalid content type",
      }),
    fileSize: z
      .number()
      .meta({
        description: "File size in bytes",
        examples: [1024],
      })
      .min(1)
      .max(MAX_UPLOAD_SIZE),
  })
  .meta({
    id: "upload-file-schema",
  });

export const batchUploadSchema = z.object({
  files: z.array(uploadFileSchema).min(1).max(100),
});

export const UploadResultSchema = z
  .object({
    url: z.url().meta({
      description:
        "Presigned URL for file upload. Make a `PUT` request to this URL with the file content and the `Content-Type` header.",
    }),
    key: z.string().meta({
      description:
        "Key of the file in the storage. You'll send this in the `MANAGED_FILE` payload when creating an ingest job.",
    }),
  })
  .meta({
    id: "upload-result-schema",
    title: "Upload Result",
  });
