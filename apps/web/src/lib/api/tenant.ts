import type { NextRequest } from "next/server";
import { tenantHeaderSchema } from "@/openapi/v1/utils";

import { AgentsetApiError } from "./errors";

export const getTenantFromRequest = (request: NextRequest) => {
  const tenantId = request.headers.get("x-tenant-id") ?? undefined;

  const parsedTenantId = tenantHeaderSchema.safeParse(tenantId);
  if (!parsedTenantId.success) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Invalid tenant ID.",
    });
  }

  return parsedTenantId.data;
};
