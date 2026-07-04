import type { InternalContext } from "@/server/orpc/base";
import { auth } from "@/lib/auth";
import { internalRouter } from "@/server/orpc/internal/router";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";

const handler = new RPCHandler<InternalContext>(internalRouter, {
  plugins: [new BatchHandlerPlugin()],
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

  const context: InternalContext = {
    headers: request.headers,
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
