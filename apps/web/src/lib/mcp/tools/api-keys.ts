import { AgentsetApiError } from "@/lib/api/errors";
import { runTool } from "@/lib/mcp/run-tool";
import {
  ApiKeySchema,
  createApiKeyBodySchema,
  CreatedApiKeySchema,
} from "@/schemas/api/api-key";
import { createApiKey } from "@/services/api-key/create";
import { deleteApiKey } from "@/services/api-key/delete";
import { listApiKeys } from "@/services/api-key/list";
import { z } from "zod/v4";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prefixId } from "@agentset/utils";

export const registerApiKeyTools = (server: McpServer) => {
  server.registerTool(
    "list_api_keys",
    {
      title: "List API keys",
      description:
        "List the organization's API keys (label, scope, and timestamps). The key material itself is never returned; it is only visible once, when a key is created.",
    },
    async (extra) =>
      runTool(extra, async (ctx) => {
        const apiKeys = await listApiKeys({
          organizationId: ctx.organizationId,
        });

        return apiKeys.map((apiKey) =>
          ApiKeySchema.parse({
            ...apiKey,
            organizationId: prefixId(apiKey.organizationId, "org_"),
          }),
        );
      }),
  );

  server.registerTool(
    "create_api_key",
    {
      title: "Create API key",
      description:
        "Create a new API key for the organization. The response includes the full key (starts with `agentset_`) exactly once — store it securely, it cannot be retrieved again.",
      inputSchema: createApiKeyBodySchema.shape,
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const apiKey = await createApiKey({
          organizationId: ctx.organizationId,
          label: args.label,
          scope: args.scope,
        });

        return CreatedApiKeySchema.parse({
          ...apiKey,
          organizationId: prefixId(apiKey.organizationId, "org_"),
        });
      }),
  );

  server.registerTool(
    "revoke_api_key",
    {
      title: "Revoke API key",
      description:
        "Permanently revoke (delete) an API key by its ID. Use list_api_keys to find the ID. Revoking the key you are currently authenticated with will break this connection.",
      inputSchema: {
        keyId: z.string().describe("The ID of the API key to revoke."),
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        if (!args.keyId) {
          throw new AgentsetApiError({
            code: "bad_request",
            message: "Invalid API key ID.",
          });
        }

        // scoped to the organization; a missing key throws P2025 which maps to not_found
        const apiKey = await deleteApiKey({
          id: args.keyId,
          organizationId: ctx.organizationId,
        });

        return { deleted: true, id: apiKey.id };
      }),
  );
};
