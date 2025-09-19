import type { ZodOpenApiPathsObject } from "zod-openapi";

import { createNamespace } from "./create-namespace";
import { deleteNamespace } from "./delete-namespace";
import { getNamespace } from "./get-namespace";
import { listNamespaces } from "./list-namespaces";
import { updateNamespace } from "./update-namespace";

export const namespacesPaths: ZodOpenApiPathsObject = {
  "/v1/namespace": {
    get: listNamespaces,
    post: createNamespace,
  },
  "/v1/namespace/{namespaceId}": {
    get: getNamespace,
    patch: updateNamespace,
    delete: deleteNamespace,
  },
};
