import { withAuthApiHandler } from "@/lib/api/handler";
import { parseRequestBody } from "@/lib/api/utils";
import { streamChat } from "@/lib/chat";
import { waitUntil } from "@vercel/functions";
import { convertToModelMessages } from "ai";

import { db } from "@agentset/db/client";

import { chatSchema } from "./schema";

const incrementUsage = (namespaceId: string, queries: number) => {
  waitUntil(
    (async () => {
      // track usage
      await db.namespace.update({
        where: {
          id: namespaceId,
        },
        data: {
          totalPlaygroundUsage: { increment: 1 },
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

export const preferredRegion = "iad1"; // make this closer to the DB
export const maxDuration = 120;

export const POST = withAuthApiHandler(
  async ({ req, namespace, tenantId, headers }) => {
    const body = await chatSchema.parseAsync(await parseRequestBody(req));

    return streamChat({
      namespace,
      tenantId,
      messages: convertToModelMessages(body.messages),
      options: body,
      headers,
      onUsageIncrement: (queries) => {
        incrementUsage(namespace.id, queries);
      },
    });
  },
);
