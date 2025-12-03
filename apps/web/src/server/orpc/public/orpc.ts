/**
 * Public API oRPC Server Setup
 *
 * Sets up the oRPC server infrastructure for public API routes.
 * These routes authenticate via API key rather than user session.
 */

import type { ApiKeyInfo } from "@/lib/api/api-key";
import { getApiKeyInfo } from "@/lib/api/api-key";
import { AgentsetApiError } from "@/lib/api/errors";
import { ratelimit } from "@/lib/api/rate-limit";
import { tenantHeaderSchema } from "@/schemas/api/misc";
import { ORPCError, os } from "@orpc/server";

import type { Organization } from "@agentset/db";
import { db } from "@agentset/db/client";

import { errorCodeToORPCCode } from "../utils";

/**
 * 1. CONTEXT TYPES
 *
 * Define the context types for public API routes.
 */
export type PublicORPCContext = {
  db: typeof db;
  headers: Headers;
  organization: Pick<Organization, "id"> & ApiKeyInfo["organization"];
  apiScope: string;
  tenantId?: string;
  rateLimit?: {
    limit: number;
    reset: number;
    remaining: number;
  };
};

/**
 * 2. CONTEXT CREATION
 *
 * Helper to create context from request headers and API key.
 */
export const createPublicORPCContext = async (opts: {
  headers: Headers;
}): Promise<PublicORPCContext> => {
  const authorizationHeader = opts.headers.get("Authorization");
  if (!authorizationHeader) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Unauthorized: Invalid API key.",
    });
  }

  if (!authorizationHeader.includes("Bearer ")) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Misconfigured authorization header. Did you forget to add 'Bearer '?",
    });
  }

  const apiKey = authorizationHeader.replace("Bearer ", "");

  const orgApiKey = await getApiKeyInfo(apiKey);
  if (!orgApiKey) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Unauthorized: Invalid API key.",
    });
  }

  // Rate limiting
  const rateLimit = orgApiKey.organization.apiRatelimit;
  const { success, limit, reset, remaining } = await ratelimit(
    rateLimit,
    "1 m",
  ).limit(orgApiKey.organizationId);

  if (!success) {
    throw new ORPCError("TOO_MANY_REQUESTS", {
      message: "Too many requests.",
    });
  }

  const rawTenantId = opts.headers.get("x-tenant-id");
  let tenantId: string | undefined = undefined;

  if (rawTenantId !== null) {
    const parsedTenantId = tenantHeaderSchema.safeParse(rawTenantId);
    if (!parsedTenantId.success) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Invalid tenant ID.",
      });
    }
    tenantId = parsedTenantId.data;
  }

  const organization = {
    id: orgApiKey.organizationId,
    ...orgApiKey.organization,
  };

  return {
    db,
    headers: opts.headers,
    organization,
    apiScope: orgApiKey.scope,
    tenantId,
    rateLimit: {
      limit,
      reset: Number(reset),
      remaining,
    },
  };
};

/**
 * 3. BASE SETUP
 *
 * Define the base oRPC instance with context type.
 */
const base = os.$context<PublicORPCContext>();

/**
 * 4. MIDDLEWARE
 *
 * Middleware for timing procedure execution and error handling.
 */
const timingMiddleware = base.middleware(async ({ next, path }) => {
  const start = Date.now();

  try {
    const result = next();

    const end = Date.now();
    const pathStr = path.join(".");
    console.log(`[Public API] ${pathStr} took ${end - start}ms to execute`);

    return result;
  } catch (error) {
    if (error instanceof AgentsetApiError) {
      throw new ORPCError(errorCodeToORPCCode(error.code), {
        message: error.message,
      });
    }
    throw error;
  }
});

/**
 * 6. PROCEDURES
 *
 * Public API procedure (authenticated via API key).
 */
export const publicApiProcedure = base.use(timingMiddleware);
