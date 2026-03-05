import type { ZodOpenApiPathsObject } from "zod-openapi";

import { deleteDocument } from "./delete-document";
import { getChunksDownloadUrl } from "./get-chunks-download-url";
import { getDocument } from "./get-document";
import { getFileDownloadUrl } from "./get-file-download-url";
import { listDocuments } from "./list-documents";

export const documentsPaths: ZodOpenApiPathsObject = {
  "/v1/namespace/{namespaceId}/documents": {
    get: listDocuments,
  },
  "/v1/namespace/{namespaceId}/documents/{documentId}": {
    get: getDocument,
    delete: deleteDocument,
  },
  "/v1/namespace/{namespaceId}/documents/{documentId}/chunks-download-url": {
    post: getChunksDownloadUrl,
  },
  "/v1/namespace/{namespaceId}/documents/{documentId}/file-download-url": {
    post: getFileDownloadUrl,
  },
};
