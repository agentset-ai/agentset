import type { InternalRouter } from "@/server/orpc/internal/router";
import type {
  InferRouterInputs,
  InferRouterOutputs,
  RouterClient,
} from "@orpc/server";
import { getBaseUrl } from "@/lib/utils";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

const link = new RPCLink({
  url: () => getBaseUrl() + "/api/rpc",
  plugins: [
    new BatchLinkPlugin({
      groups: [{ condition: () => true, context: {} }],
    }),
  ],
});

/** Imperative client — the `trpcClient.x.y.query()` replacement. */
export const client: RouterClient<InternalRouter> = createORPCClient(link);

/** TanStack Query utils — the `useTRPC()` replacement (plain import, no hook). */
export const orpc = createTanstackQueryUtils(client);

/**
 * Inference helpers for inputs/outputs.
 *
 * @example type Namespaces = RouterOutputs["namespace"]["getOrgNamespaces"]
 */
export type RouterInputs = InferRouterInputs<InternalRouter>;
export type RouterOutputs = InferRouterOutputs<InternalRouter>;
