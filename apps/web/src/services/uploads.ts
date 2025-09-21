import { extname } from "node:path";
import { batchUploadSchema, uploadFileSchema } from "@/schemas/api/upload";
import z from "zod/v4";

import { presignUploadUrl } from "@agentset/storage";
import { filenamize, tryCatch } from "@agentset/utils";

const SUPPORTED_EXTENSIONS = [
  ".bmp",
  ".csv",
  ".doc",
  ".docx",
  ".eml",
  ".epub",
  ".heic",
  ".html",
  ".jpeg",
  ".png",
  ".md",
  ".msg",
  ".odt",
  ".org",
  ".p7s",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".rst",
  ".rtf",
  ".tiff",
  ".txt",
  ".tsv",
  ".xls",
  ".xlsx",
  ".xml",
];

const SUPPORTED_MIME_TYPES = [
  "image/bmp", // .bmp
  "text/csv", // .csv
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "message/rfc822", // .eml
  "application/epub", // .epub
  "application/epub+zip", // .epub
  "image/heif",
  "image/heif-sequence",
  "image/heic",
  "image/heic-sequence",
  "text/html", // .html
  "image/jpeg", // .jpeg
  "image/png", // .png
  "text/markdown", // .md
  "application/vnd.ms-outlook", // .msg (sometimes message/rfc822)
  "application/vnd.oasis.opendocument.text", // .odt
  "text/x-org", // .org (not official, but often used)
  "application/pkcs7-signature", // .p7s
  "application/pdf", // .pdf
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "text/x-rst", // .rst (not official; sometimes text/plain)
  "application/rtf", // .rtf
  "image/tiff", // .tiff
  "text/plain", // .txt
  "text/tab-separated-values", // .tsv
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/xml", // .xml
];

export const isContentTypeSupported = (contentType: string): boolean => {
  return SUPPORTED_MIME_TYPES.includes(contentType);
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
