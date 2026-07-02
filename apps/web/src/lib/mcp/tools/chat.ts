import {
  checkSearchLimit,
  incrementOrganizationSearchUsage,
} from "@/lib/api/usage";
import { generateChat } from "@/lib/chat";
import { resolveNamespace, runTool } from "@/lib/mcp/run-tool";
import { namespaceIdSchema } from "@/lib/mcp/schemas";
import {
  chatMessageSchema,
  chatOptionsSchema,
  chatSchema,
} from "@/schemas/api/chat";
import { toModelMessages } from "@/services/chat";
import { z } from "zod/v4";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const registerChatTools = (server: McpServer) => {
  server.registerTool(
    "chat",
    {
      title: "Chat with a namespace",
      description:
        "Generate a grounded (RAG) answer from the documents of a namespace, with the retrieved chunks returned as sources. Modes: `normal` (single retrieval, fast), `agentic` (the model generates and evaluates its own search queries, slower but more thorough), and `deepResearch` (iterative research pipeline — slow, can take a minute or more, and does not return sources). Counts toward the organization's search quota (agentic mode counts one search per query it runs). Non-streaming; for streaming use the REST API.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        messages: z
          .array(chatMessageSchema)
          .min(1)
          .describe(
            "The conversation so far. The last message must be from the user, it will be used as the query.",
          ),
        ...chatOptionsSchema.shape,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        checkSearchLimit(ctx.organization);

        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const { namespaceId: _namespaceId, ...rest } = args;

        // re-parse with the REST chat schema to apply the same cross-field
        // validation (e.g. rerankLimit <= topK)
        const body = await chatSchema.parseAsync({ ...rest, stream: false });

        const { text, sources } = await generateChat({
          namespace,
          tenantId: ctx.tenantId,
          messages: toModelMessages(body.messages),
          options: body,
          onUsageIncrement: (queries) => {
            incrementOrganizationSearchUsage(ctx.organizationId, queries);
          },
        });

        return {
          message: { role: "assistant", content: text },
          sources,
        };
      }),
  );
};
