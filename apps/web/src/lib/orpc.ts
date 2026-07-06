import type { AppRouter } from "@/server/orpc/router";
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

/**
 * Client context for per-call auth scoping. Shared (REST-shaped) procedures
 * resolve the organization from this header on the session branch — pass it
 * wherever a call has no org-bearing input:
 *
 * @example orpc.apiKey.create.mutationOptions({ context: { orgId: organization.id } })
 */
export interface ORPCClientContext {
  orgId?: string;
}

const link = new RPCLink<ORPCClientContext>({
  url: () => getBaseUrl() + "/api/rpc",
  // per-call headers survive batching: the batch body carries per-item headers
  // and the server's RequestHeadersPlugin restores them per procedure call
  headers: ({ context }) =>
    context.orgId ? { "x-organization-id": context.orgId } : {},
  plugins: [
    new BatchLinkPlugin({
      groups: [{ condition: () => true, context: {} }],
    }),
  ],
});

/** Imperative client — the `trpcClient.x.y.query()` replacement. */
export const client: RouterClient<AppRouter, ORPCClientContext> =
  createORPCClient(link);

/** TanStack Query utils — the `useTRPC()` replacement (plain import, no hook). */
export const orpc = createTanstackQueryUtils(client);

/**
 * Inference helpers for inputs/outputs.
 *
 * @example type Namespaces = RouterOutputs["namespace"]["getOrgNamespaces"]
 */
export type RouterInputs = InferRouterInputs<AppRouter>;
export type RouterOutputs = InferRouterOutputs<AppRouter>;
