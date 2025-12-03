import type { ProtectedORPCContext } from "./orpc";

/**
 * Helper function to get namespace by user
 * This is used across multiple routers to verify namespace access.
 *
 * Note: We don't use React's `cache()` here because:
 * - oRPC procedures are called via HTTP RPC, not React Server Components
 * - React's `cache()` only works within a single RSC render
 * - If we later add oRPC caller for RSC, we can add caching then
 */
export const getNamespaceByUser = async (
  ctx: ProtectedORPCContext,
  idOrSlug:
    | {
        id: string;
      }
    | {
        slug: string;
      },
) => {
  return await ctx.db.namespace.findFirst({
    where: {
      ...("id" in idOrSlug ? { id: idOrSlug.id } : { slug: idOrSlug.slug }),
      organization: {
        members: { some: { userId: ctx.session.user.id } },
      },
    },
  });
};
