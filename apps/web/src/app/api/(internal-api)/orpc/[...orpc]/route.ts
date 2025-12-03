import type { NextRequest } from "next/server";
import { env } from "@/env";
import { createORPCContext } from "@/server/orpc/orpc";
import { appRouter } from "@/server/orpc/root";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

/**
 * oRPC handler for HTTP requests (e.g. when you make requests from Client Components).
 * Uses the standard RPC protocol.
 *
 * @see https://orpc.dev/docs/adapters/next
 */
const handler = new RPCHandler(appRouter, {
  interceptors:
    env.NODE_ENV === "development"
      ? [
          onError((error: unknown) => {
            if (error instanceof Error) {
              console.error(`❌ oRPC failed: ${error.message}`);
            } else {
              console.error(`❌ oRPC failed: ${String(error)}`);
            }
          }),
        ]
      : [],
});

async function handleRequest(request: NextRequest) {
  const context = await createORPCContext({
    headers: request.headers,
  });

  const { response } = await handler.handle(request, {
    prefix: "/api/orpc",
    context,
  });

  return response ?? new Response("Not found", { status: 404 });
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
