import type { NextRequest } from "next/server";
import { env } from "@/env";
import { createPublicORPCContext } from "@/server/orpc/public/orpc";
import { publicApiRouter } from "@/server/orpc/public/root";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError, ORPCError } from "@orpc/server";

// Optimize for database proximity
export const preferredRegion = "iad1";
export const maxDuration = 60;
/**
 * Public API handler using oRPC OpenAPIHandler
 *
 * Serves REST endpoints with automatic OpenAPI generation.
 * Authenticates via API key in Authorization header.
 */
const handler = new OpenAPIHandler(publicApiRouter, {
  interceptors:
    env.NODE_ENV === "development"
      ? [
          onError((error: unknown) => {
            if (error instanceof Error) {
              console.error(`❌ Public API failed: ${error.message}`);
            } else {
              console.error(`❌ Public API failed: ${String(error)}`);
            }
          }),
        ]
      : [],
});

async function handleRequest(request: NextRequest) {
  try {
    const context = await createPublicORPCContext({
      headers: request.headers,
    });

    const { matched, response } = await handler.handle(request, {
      prefix: "/api/v1",
      context,
    });

    if (!matched) {
      return new Response("Not found", { status: 404 });
    }

    // Add rate limit headers to the response
    if (context.rateLimit) {
      // Clone response to avoid consuming the body stream
      const newResponse = response.clone();

      newResponse.headers.set(
        "X-RateLimit-Limit",
        context.rateLimit.limit.toString(),
      );
      newResponse.headers.set(
        "X-RateLimit-Remaining",
        context.rateLimit.remaining.toString(),
      );
      newResponse.headers.set(
        "X-RateLimit-Reset",
        context.rateLimit.reset.toString(),
      );
      newResponse.headers.set(
        "Retry-After",
        context.rateLimit.reset.toString(),
      );

      return newResponse;
    }

    return response;
  } catch (error) {
    console.error("Public API error:", error);

    // If it's an ORPCError, convert it to a proper HTTP response
    if (error instanceof ORPCError) {
      const statusMap: Record<string, number> = {
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        TOO_MANY_REQUESTS: 429,
        INTERNAL_SERVER_ERROR: 500,
      };

      const errorCode: string = String(error.code);
      const status = statusMap[errorCode] ?? 500;
      const errorMessage: string = String(error.message);

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: errorCode.toLowerCase().replace(/_/g, "-"),
            message: errorMessage,
          },
        }),
        {
          status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // For other errors, return a 500 error
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "internal_server_error",
          message: "An internal server error occurred.",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
