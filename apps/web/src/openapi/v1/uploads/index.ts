import type { ZodOpenApiPathsObject } from "zod-openapi";

import { createBatchUpload } from "./create-batch-upload";
import { createUpload } from "./create-upload";

export const uploadsPaths: ZodOpenApiPathsObject = {
  "/v1/namespace/{namespaceId}/uploads": {
    post: createUpload,
  },
  "/v1/namespace/{namespaceId}/uploads/batch": {
    post: createBatchUpload,
  },
};
