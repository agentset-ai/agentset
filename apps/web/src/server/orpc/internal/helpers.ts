import type { ProtectedContext } from "@/server/orpc/base";
import { cache } from "react";

import { db } from "@agentset/db/client";

export const getNamespaceByUser = cache(
  async (
    ctx: Pick<ProtectedContext, "session">,
    idOrSlug:
      | {
          id: string;
        }
      | {
          slug: string;
        },
  ) => {
    return await db.namespace.findFirst({
      where: {
        ...("id" in idOrSlug ? { id: idOrSlug.id } : { slug: idOrSlug.slug }),
        organization: {
          members: { some: { userId: ctx.session.user.id } },
        },
      },
    });
  },
);
