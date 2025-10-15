import type { ZodOpenApiPathsObject } from "zod-openapi";

import { deleteHosting } from "./delete-hosting";
import { enableHosting } from "./enable-hosting";
import { getHosting } from "./get-hosting";
import { updateHosting } from "./update-hosting";

export const hostingPaths: ZodOpenApiPathsObject = {
  "/v1/namespace/{namespaceId}/hosting": {
    get: getHosting,
    post: enableHosting,
    patch: updateHosting,
    delete: deleteHosting,
  },
};
