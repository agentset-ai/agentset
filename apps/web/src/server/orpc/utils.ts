/**
 * Shared oRPC Utilities
 *
 * Common utilities for oRPC.
 */

import type { AgentsetApiError } from "@/lib/api/errors";

/**
 * Map AgentsetApiError codes to oRPC error codes
 */
export const errorCodeToORPCCode = (code: AgentsetApiError["code"]): string => {
  switch (code) {
    case "bad_request":
      return "BAD_REQUEST";
    case "unauthorized":
      return "UNAUTHORIZED";
    case "forbidden":
    case "exceeded_limit":
      return "FORBIDDEN";
    case "not_found":
      return "NOT_FOUND";
    case "conflict":
    case "invite_pending":
      return "CONFLICT";
    case "rate_limit_exceeded":
      return "TOO_MANY_REQUESTS";
    case "unprocessable_entity":
      return "UNPROCESSABLE_CONTENT";
    case "internal_server_error":
      return "INTERNAL_SERVER_ERROR";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
};
