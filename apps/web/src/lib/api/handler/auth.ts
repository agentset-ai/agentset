import type { Session } from "@/lib/auth-types";
import type { NextRequest } from "next/server";
import { logRequestError } from "@/lib/log";

import type { Namespace } from "@agentset/db";

import type { HandlerParams } from "./base";
import { AgentsetApiError, handleAndReturnErrorResponse } from "../errors";
import { ratelimit } from "../rate-limit";
import { authenticateRequestSession } from "../session";
import { getTenantFromRequest } from "../tenant";
import { getSearchParams } from "../utils";

interface AuthHandler {
  (
    params: Omit<HandlerParams, "organization" | "apiScope"> & {
      session: Session;
      namespace: Namespace;
    },
  ): Promise<Response>;
}

export const withAuthApiHandler = (
  handler: AuthHandler,
  { requireNamespace = true }: { requireNamespace?: boolean } = {},
) => {
  return async (
    req: NextRequest,
    { params }: { params: Promise<Record<string, string> | undefined> },
  ) => {
    const routeParams = await params;
    const searchParams = getSearchParams(req);

    const namespaceId = searchParams.namespaceId;
    let userId: string | undefined = undefined;
    let headers = {};

    try {
      if (requireNamespace && !namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Namespace ID is required",
        });
      }

      const tenantId = getTenantFromRequest(req);
      const { namespace, session } = await authenticateRequestSession(
        req,
        namespaceId,
      );

      userId = session.user.id;
      const rateLimit = 600;
      const { success, limit, reset, remaining } = await ratelimit(
        rateLimit,
        "1 m",
      ).limit(`user:${session.user.id}`);

      headers = {
        "Retry-After": reset.toString(),
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      };

      if (!success) {
        throw new AgentsetApiError({
          code: "rate_limit_exceeded",
          message: "Too many requests.",
        });
      }

      return await handler({
        req,
        params: routeParams ?? {},
        searchParams,
        namespace,
        session,
        tenantId,
      });
    } catch (error) {
      logRequestError("Session API request failed", error, {
        namespaceId,
        userId,
      });
      return handleAndReturnErrorResponse(error, headers);
    }
  };
};
