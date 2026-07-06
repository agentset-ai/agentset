import type { ApiContext } from "@/server/orpc/base";
import { auth } from "@/lib/auth";
import { toDashboardORPCError } from "@/server/orpc/base";
import { appRouter } from "@/server/orpc/router";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import {
  BatchHandlerPlugin,
  RequestHeadersPlugin,
} from "@orpc/server/plugins";

const handler = new RPCHandler<ApiContext>(appRouter, {
  plugins: [
    new BatchHandlerPlugin(),
    // injects per-item headers as context.reqHeaders AFTER batch splitting,
    // so each batched call authenticates with its own x-organization-id
    new RequestHeadersPlugin(),
  ],
  clientInterceptors: [
    // port of the old timingMiddleware: timing log + AgentsetApiError → typed
    // transport error (dashboard mutations surface 4xx instead of 500)
    async (options) => {
      const start = Date.now();

      try {
        const result = await options.next();

        const end = Date.now();
        console.log(
          `[RPC] ${options.path.join(".")} took ${end - start}ms to execute`,
        );

        return result;
      } catch (error) {
        throw toDashboardORPCError(error);
      }
    },
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

async function handleRequest(request: Request) {
  // resolve the session once per HTTP request (parity with createTRPCContext),
  // shared across batched procedure calls
  const session = await auth.api.getSession({ headers: request.headers });

  const context: ApiContext = {
    resHeaders: {},
    analytics: {},
    session,
  };

  const { response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context,
  });

  return response ?? new Response("Not found", { status: 404 });
}

export {
  handleRequest as GET,
  handleRequest as POST,
  handleRequest as PUT,
  handleRequest as PATCH,
  handleRequest as DELETE,
  handleRequest as HEAD,
};
