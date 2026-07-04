import type { NextRequest } from "next/server";

import type { Organization } from "@agentset/db";

import type { ApiKeyInfo } from "../api-key";

/**
 * Shared param shape for the remaining legacy wrappers (`withAuthApiHandler`,
 * `withPublicApiHandler`). The org-API-key wrapper that used to live here was
 * replaced by the oRPC middleware in `@/server/orpc/base`.
 */
export interface HandlerParams {
  req: NextRequest;
  params: Record<string, string>;
  searchParams: Record<string, string>;
  organization: Pick<Organization, "id"> & ApiKeyInfo["organization"];
  apiScope: string;
  tenantId?: string;
  headers?: Record<string, string>;
}
