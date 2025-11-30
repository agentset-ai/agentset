"use client";

import type { AppRouter } from "@/server/orpc/root";
import type { RouterUtils } from "@orpc/react-query";
import type { RouterClient } from "@orpc/server";
import type { QueryClient } from "@tanstack/react-query";
import { createContext, use, useState } from "react";
import { createQueryClient } from "@/lib/query-client";
import { getBaseUrl } from "@/lib/utils";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCReactQueryUtils } from "@orpc/react-query";
import { QueryClientProvider } from "@tanstack/react-query";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    return createQueryClient();
  }
  return (clientQueryClientSingleton ??= createQueryClient());
};

/**
 * oRPC client for client-side usage
 * Uses RPCLink to communicate with the oRPC API route
 */
const link = new RPCLink({
  url: getBaseUrl() + "/api/orpc",
  headers: () => {
    const headers = new Headers();
    headers.set("x-orpc-source", "nextjs-react");
    return headers;
  },
});

export const orpcClient: RouterClient<AppRouter> = createORPCClient(link);

/**
 * React Query utilities for oRPC
 * Provides queryOptions and mutationOptions for React Query integration
 */
type ORPCReactUtils = RouterUtils<RouterClient<AppRouter>>;

const ORPCContext = createContext<ORPCReactUtils | undefined>(undefined);

/**
 * Hook to access oRPC React Query utilities
 *
 * @example
 * ```tsx
 * import { useQuery } from "@tanstack/react-query";
 * import { skipToken } from "@tanstack/react-query";
 *
 * const orpc = useORPC();
 *
 * // Basic query
 * const { data } = useQuery(
 *   orpc.namespace.getOrgNamespaces.queryOptions({ input: { slug: "my-org" } })
 * );
 *
 * // Conditional query with skipToken
 * const { data } = useQuery(
 *   orpc.namespace.getOrgNamespaces.queryOptions({
 *     input: slug ? { slug } : skipToken,
 *   })
 * );
 *
 * // Mutation
 * const mutation = useMutation(
 *   orpc.namespace.create.mutationOptions()
 * );
 * mutation.mutate({ name: "New Namespace" });
 *
 * // Error handling
 * import { isDefinedError } from "@orpc/client";
 * if (mutation.error && isDefinedError(mutation.error)) {
 *   // Handle type-safe error
 * }
 * ```
 */
export function useORPC(): ORPCReactUtils {
  const orpc = use(ORPCContext);
  if (!orpc) {
    throw new Error("ORPCContext is not set up properly");
  }
  return orpc;
}

/**
 * oRPC React Query Provider
 *
 * This provider sets up React Query and oRPC utilities for client-side usage.
 * Wraps your app with React Query and oRPC utilities.
 *
 * @see https://orpc.dev/docs/integrations/tanstack-query-old/react
 */
export function ORPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [orpc] = useState(() => createORPCReactQueryUtils(orpcClient));

  return (
    <QueryClientProvider client={queryClient}>
      <ORPCContext.Provider value={orpc}>{props.children}</ORPCContext.Provider>
    </QueryClientProvider>
  );
}
