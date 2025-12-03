import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { createORPCContext } from "@/server/orpc/orpc";
import { appRouter } from "@/server/orpc/root";
import { createRouterClient } from "@orpc/server";

/**
 * This wraps the `createORPCContext` helper and provides the required context for the oRPC API when
 * handling an oRPC call from a React Server Component.
 *
 * Uses React's cache() to ensure the context is created once per request.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-orpc-source", "rsc");

  return createORPCContext({
    headers: heads,
  });
});

/**
 * Server-side oRPC client for direct procedure calls in React Server Components.
 *
 * Usage:
 * ```tsx
 * const data = await orpcApi.search.search({ namespaceId: "...", query: "..." });
 * ```
 */
export const orpcApi = createRouterClient(appRouter, {
  context: async () => await createContext(),
});
