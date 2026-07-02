import type { ZodOpenApiPathsObject } from "zod-openapi";

import { addDomain } from "./add-domain";
import { checkDomainStatus } from "./check-domain-status";
import { deleteHosting } from "./delete-hosting";
import { enableHosting } from "./enable-hosting";
import { getHosting } from "./get-hosting";
import { removeDomain } from "./remove-domain";
import { updateHosting } from "./update-hosting";

export const hostingPaths: ZodOpenApiPathsObject = {
  "/v1/namespace/{namespaceId}/hosting": {
    get: getHosting,
    post: enableHosting,
    patch: updateHosting,
    delete: deleteHosting,
  },
  "/v1/namespace/{namespaceId}/hosting/domain": {
    get: checkDomainStatus,
    post: addDomain,
    delete: removeDomain,
  },
};
