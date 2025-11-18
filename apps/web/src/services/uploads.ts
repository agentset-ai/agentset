import { extname } from "node:path";
import {
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
  SUPPORTED_MIME_TYPES_PREFIXES,
} from "@/lib/file-types";
import { batchUploadSchema, uploadFileSchema } from "@/schemas/api/upload";
import z from "zod/v4";

import { presignUploadUrl } from "@agentset/storage";
import { filenamize, tryCatch } from "@agentset/utils";

export const isContentTypeSupported = (contentType: string): boolean => {
  return (
    SUPPORTED_MIME_TYPES.includes(contentType) ||
    SUPPORTED_MIME_TYPES_PREFIXES.some((prefix) =>
      contentType.startsWith(prefix),
    )
  );
};

export const isFileExtensionSupported = (fileName: string): boolean => {
  const ext = extname(fileName);
  return SUPPORTED_EXTENSIONS.includes(ext);
};

const generateStorageKey = (namespaceId: string, fileName: string): string => {
  const ext = extname(fileName);
  const filename = filenamize(fileName.replace(ext, ""));
  return `namespaces/${namespaceId}/${filename}${ext}`;
};

export const validateNamespaceFileKey = (namespaceId: string, key: string) => {
  // make sure the file key used for MANAGED_FILE is valid and matches the format of `namespaces/${namespaceId}/${filename}${ext}`
  // this also ensures that the file belongs to the namespace
  return key.startsWith(`namespaces/${namespaceId}/`);
};

export const createUpload = async ({
  namespaceId,
  file,
}: {
  file: z.infer<typeof uploadFileSchema>;
  namespaceId: string;
}) => {
  const key = generateStorageKey(namespaceId, file.fileName);
  const urlResult = await tryCatch(
    presignUploadUrl({
      key,
      contentType: file.contentType,
      fileSize: file.fileSize,
    }),
  );

  if (urlResult.error) {
    return {
      success: false as const,
      error: "Failed to generate presigned URL",
    };
  }

  return {
    success: true as const,
    data: {
      url: urlResult.data,
      key,
    },
  };
};

export const createBatchUpload = async ({
  namespaceId,
  files,
}: z.infer<typeof batchUploadSchema> & { namespaceId: string }) => {
  const preparedFiles = files.map((file) => ({
    ...file,
    key: generateStorageKey(namespaceId, file.fileName),
  }));
  const urlResults = await Promise.all(
    preparedFiles.map(async (file) => {
      const urlResult = await tryCatch(
        presignUploadUrl({
          key: file.key,
          contentType: file.contentType,
          fileSize: file.fileSize,
        }),
      );

      return {
        url: urlResult,
        key: file.key,
      };
    }),
  );

  const failedResults = urlResults.filter((result) => result.url.error);
  if (failedResults.length > 0) {
    return {
      success: false as const,
      error: "Failed to generate presigned URLs",
    };
  }

  return {
    success: true as const,
    data: urlResults.map((result) => ({
      url: result.url.data!,
      key: result.key,
    })),
  };
};
