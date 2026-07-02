import type { ZodOpenApiPathsObject } from "zod-openapi";

import { createApiKey } from "./create-api-key";
import { deleteApiKey } from "./delete-api-key";
import { listApiKeys } from "./list-api-keys";

export const apiKeysPaths: ZodOpenApiPathsObject = {
  "/v1/api-keys": {
    get: listApiKeys,
    post: createApiKey,
  },
  "/v1/api-keys/{keyId}": {
    delete: deleteApiKey,
  },
};
