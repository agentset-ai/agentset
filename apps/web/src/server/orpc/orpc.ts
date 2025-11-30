/**
 * oRPC Server Setup
 *
 * Sets up the oRPC server infrastructure.
 */

import { AgentsetApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { ORPCError, os } from "@orpc/server";

import { db } from "@agentset/db";

/**
 * 1. CONTEXT TYPES
 *
 * Define the context types that will be available in procedures.
 */
export type ORPCContext = {
  db: typeof db;
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  headers: Headers;
};

export type ProtectedORPCContext = ORPCContext & {
  session: NonNullable<ORPCContext["session"]>;
};

/**
 * 2. CONTEXT CREATION
 *
 * Helper to create context from request headers.
 * This will be used by the API route handler.
 */
export const createORPCContext = async (opts: {
  headers: Headers;
}): Promise<ORPCContext> => {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  return {
    db,
    session,
    headers: opts.headers,
  };
};

/**
 * 3. ERROR HANDLING
 *
 * Map AgentsetApiError error codes to oRPC error codes
 */
const errorCodeToORPCCode = (code: string): string => {
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
    default:
      return "INTERNAL_SERVER_ERROR";
  }
};

/**
 * 4. BASE SETUP
 *
 * Define the base oRPC instance with context type.
 */
const base = os.$context<ORPCContext>();

/**
 * 5. MIDDLEWARE
 *
 * Middleware for timing procedure execution and error handling.
 */
const timingMiddleware = base.middleware(async ({ next, path }) => {
  const start = Date.now();

  try {
    const result = await next();

    const end = Date.now();
    const pathStr = path.join(".");
    console.log(`[ORPC] ${pathStr} took ${end - start}ms to execute`);

    return result;
  } catch (error) {
    // Handle AgentsetApiError
    if (error instanceof AgentsetApiError) {
      throw new ORPCError(errorCodeToORPCCode(error.code), {
        message: error.message,
      });
    }
    throw error;
  }
});

/**
 * Authentication middleware - verifies session exists
 */
const authMiddleware = base.middleware(async ({ context, next }) => {
  if (!context.session) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Unauthorized",
    });
  }

  return next({
    context: {
      ...context,
      session: context.session,
    },
  });
});

/**
 * 6. PROCEDURES
 *
 * Public (unauthenticated) procedure
 */
export const publicProcedure = base.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this.
 * It verifies the session is valid and guarantees `context.session.user` is not null.
 */
export const protectedProcedure = base
  .use(timingMiddleware)
  .use(authMiddleware);
