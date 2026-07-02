import type { ZodOpenApiPathsObject } from "zod-openapi";

import { getOrganization } from "./get-organization";
import { listOrganizationMembers } from "./list-members";
import { updateOrganization } from "./update-organization";

export const organizationPaths: ZodOpenApiPathsObject = {
  "/v1/organization": {
    get: getOrganization,
    patch: updateOrganization,
  },
  "/v1/organization/members": {
    get: listOrganizationMembers,
  },
};
