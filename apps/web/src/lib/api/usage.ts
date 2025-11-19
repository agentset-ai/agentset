import { waitUntil } from "@vercel/functions";

import { db } from "@agentset/db/client";

export const incrementSearchUsage = (namespaceId: string, queries: number) => {
  // track usage
  waitUntil(
    (async () => {
      await db.namespace.update({
        where: {
          id: namespaceId,
        },
        data: {
          organization: {
            update: {
              searchUsage: { increment: queries },
            },
          },
        },
      });
    })(),
  );
};
