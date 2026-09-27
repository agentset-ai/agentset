import type { NextRequest } from "next/server";
import { logRequestError } from "@/lib/log";

import type { HandlerParams } from "./base";
import { handleAndReturnErrorResponse } from "../errors";
import { getSearchParams } from "../utils";

interface PublicHandler {
  (
    params: Omit<HandlerParams, "organization" | "apiScope" | "tenantId">,
  ): Promise<Response>;
}

export const withPublicApiHandler = (handler: PublicHandler) => {
  return async (
    req: NextRequest,
    { params }: { params: Promise<Record<string, string> | undefined> },
  ) => {
    const routeParams = await params;
    const searchParams = getSearchParams(req);

    const headers = {};

    try {
      return await handler({
        req,
        params: routeParams ?? {},
        searchParams,
      });
    } catch (error) {
      logRequestError("Public API request failed", error);
      return handleAndReturnErrorResponse(error, headers);
    }
  };
};
