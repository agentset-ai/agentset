import type { ApiKeyInfo } from "@/lib/api/api-key";
import type { NextRequest } from "next/server";
import { getApiKeyInfo } from "@/lib/api/api-key";
import { getTenantFromRequest } from "@/lib/api/tenant";

import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { tryCatch } from "@agentset/utils";

export interface McpAuthContext {
  organizationId: string;
  organization: ApiKeyInfo["organization"];
  tenantId?: string;
}

// resolves an org API key (Bearer agentset_...) to the same org info the REST v1 handlers use
export const verifyMcpToken = async (
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  if (!bearerToken?.startsWith("agentset_")) return undefined;

  const orgApiKey = await tryCatch(getApiKeyInfo(bearerToken));
  if (!orgApiKey.data) return undefined;

  let tenantId: string | undefined;
  try {
    // only reads the x-tenant-id header, so a plain Request is fine
    tenantId = getTenantFromRequest(req as NextRequest);
  } catch {
    // invalid x-tenant-id header
    return undefined;
  }

  const authContext: McpAuthContext = {
    organizationId: orgApiKey.data.organizationId,
    organization: orgApiKey.data.organization,
    tenantId,
  };

  return {
    token: bearerToken,
    clientId: orgApiKey.data.organizationId,
    scopes: [orgApiKey.data.scope],
    extra: authContext as unknown as Record<string, unknown>,
  };
};
