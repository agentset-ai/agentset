import type { McpAuthContext } from "@/lib/mcp/auth";
import { AgentsetApiError, handleApiError } from "@/lib/api/errors";
import { getNamespace } from "@/lib/api/handler/namespace";
import { ratelimit } from "@/lib/api/rate-limit";

import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { normalizeId } from "@agentset/utils";

type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

export const toolSuccess = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data) }],
});

export const toolError = (code: string, message: string): CallToolResult => ({
  isError: true,
  content: [
    { type: "text", text: JSON.stringify({ error: { code, message } }) },
  ],
});

// shared wrapper for every MCP tool: applies the same per-org rate limit as the
// REST v1 handlers and maps business errors to tool error results (never a
// protocol-level failure).
export const runTool = async (
  extra: ToolExtra,
  handler: (ctx: McpAuthContext) => Promise<unknown>,
): Promise<CallToolResult> => {
  const ctx = extra.authInfo?.extra as McpAuthContext | undefined;
  if (!ctx?.organizationId) {
    return toolError("unauthorized", "Unauthorized: Invalid API key.");
  }

  try {
    const { success, reset } = await ratelimit(
      ctx.organization.apiRatelimit,
      "1 m",
    ).limit(ctx.organizationId);

    if (!success) {
      return toolError(
        "rate_limit_exceeded",
        `Too many requests. Retry after ${new Date(reset).toISOString()}.`,
      );
    }

    const data = await handler(ctx);
    return toolSuccess(data);
  } catch (error) {
    // maps AgentsetApiError, ZodError, and Prisma not-found errors the same
    // way the REST error handler does
    const { error: apiError } = handleApiError(error);
    return toolError(apiError.code, apiError.message);
  }
};

// resolves a namespace like withNamespaceApiHandler does: normalize the ns_
// prefix, must be ACTIVE and belong to the key's organization
export const resolveNamespace = async (
  ctx: McpAuthContext,
  rawNamespaceId: string,
) => {
  const namespaceId = normalizeId(rawNamespaceId, "ns_");
  if (!namespaceId) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Invalid namespace ID.",
    });
  }

  const namespace = await getNamespace({
    namespaceId,
    organizationId: ctx.organizationId,
  });

  if (!namespace) {
    throw new AgentsetApiError({
      code: "unauthorized",
      message: "Unauthorized: You don't have access to this namespace.",
    });
  }

  return namespace;
};
