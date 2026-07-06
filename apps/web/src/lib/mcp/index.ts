import type { McpAuthContext } from "@/lib/mcp/auth";
import type { ApiContext } from "@/server/orpc/base";
import type { AnyProcedure, AnyRouter } from "@orpc/server";
import { toLegacyErrorParts } from "@/server/orpc/base";
import { appRouter } from "@/server/orpc/router";
import { call, getRouter, traverseContractProcedures } from "@orpc/server";
import { z } from "zod/v4";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";

export const MCP_SERVER_INFO = {
  name: "agentset",
  version: "1.0.0",
};

export const MCP_SERVER_INSTRUCTIONS = `Agentset is a RAG-as-a-service platform. This server operates one organization, determined by the API key. Tools mirror the public REST API (api.agentset.ai/v1) one-to-one and are generated from the same API contract.

Standard flow to make documents searchable:
1. create_namespace (or list_namespaces to find an existing one).
2. create_batch_upload (or create_upload for a single file) for local files, then PUT each file's bytes to its presigned URL. Skip this step for raw text, public file URLs, websites, or YouTube videos.
3. create_ingest_job with the matching payload type (MANAGED_FILE keys from step 2, TEXT, FILE, CRAWL, YOUTUBE, or BATCH).
4. Poll get_ingest_job_info until the status is COMPLETED (or check list_documents).
5. search for raw chunks, or chat for a generated answer with sources.

Multi-tenant partitioning: pass an \`x-tenant-id\` HTTP header on the MCP connection to scope ingestion, documents, search, and chat to that tenant.

Optionally, enable_hosting publishes a shareable chat/search page for a namespace; update_hosting customizes it and add_domain attaches your own domain.

IDs are prefixed (org_, ns_, job_, doc_) and tools accept them with or without the prefix. Successful results are the REST response envelope: {"success": true, "data": ..., "pagination"?: ...} (deletes return {"success": true}). Errors are returned as JSON: {"error": {"code", "message"}}.`;

type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

const toolSuccess = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data) }],
});

const toolError = (code: string, message: string): CallToolResult => ({
  isError: true,
  content: [
    { type: "text", text: JSON.stringify({ error: { code, message } }) },
  ],
});

/**
 * Per-operation adjustments where the MCP transport can't express the REST
 * behavior. Configuration only — the tool itself is still generated from the
 * procedure contract.
 */
const TOOL_OVERRIDES: Record<
  string,
  { omitInput?: string[]; forceInput?: Record<string, unknown> }
> = {
  // a streamed ReadableStream cannot be represented in a tool result
  chat: { omitInput: ["stream"], forceInput: { stream: false } },
};

/** listNamespaces → list_namespaces */
const snakeCase = (value: string) =>
  value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);

interface ContractRoute {
  method?: string;
  path?: string;
  operationId?: string;
  summary?: string;
  description?: string;
  outputStructure?: string;
}

/**
 * Every procedure that carries an operationId is a published REST operation
 * (dashboard-only procedures have no route metadata; the hidden PUT aliases
 * have no operationId) — exactly the set the OpenAPI document publishes.
 */
const collectOperations = () => {
  const operations: {
    name: string;
    path: readonly string[];
    route: ContractRoute;
    /**
     * The zod shape advertised to MCP clients. Top-level refinements don't
     * survive shape-spreading, but authoritative validation happens inside
     * `call()` against the full procedure schema anyway.
     */
    inputShape?: z.ZodRawShape;
  }[] = [];

  traverseContractProcedures(
    { router: appRouter as AnyRouter, path: [] },
    ({ contract, path }) => {
      const def = (
        contract as unknown as {
          "~orpc": { route: ContractRoute; inputSchema?: unknown };
        }
      )["~orpc"];

      const operationId = def.route.operationId;
      if (!operationId) return;

      let inputShape: Record<string, z.ZodType> | undefined;
      if (def.inputSchema instanceof z.ZodObject) {
        inputShape = { ...(def.inputSchema.shape as Record<string, z.ZodType>) };
        for (const key of TOOL_OVERRIDES[operationId]?.omitInput ?? []) {
          delete inputShape[key];
        }
      }

      operations.push({
        name: snakeCase(operationId),
        path: [...path],
        route: def.route,
        inputShape,
      });
    },
  );

  return operations;
};

/**
 * Executes a procedure through the full oRPC middleware chain with the MCP
 * connection's credentials — same auth, rate limiting, tenant scoping, and
 * input validation as the REST surface, by construction.
 */
const runProcedure = async (
  operation: ReturnType<typeof collectOperations>[number],
  args: Record<string, unknown> | undefined,
  extra: ToolExtra,
): Promise<CallToolResult> => {
  const authInfo = extra.authInfo;
  const authContext = authInfo?.extra as McpAuthContext | undefined;
  if (!authContext?.organizationId || !authInfo?.token) {
    return toolError("unauthorized", "Unauthorized: Invalid API key.");
  }

  const reqHeaders = new Headers({
    authorization: `Bearer ${authInfo.token}`,
  });
  if (authContext.tenantId) {
    reqHeaders.set("x-tenant-id", authContext.tenantId);
  }

  const context: ApiContext = { reqHeaders, resHeaders: {}, analytics: {} };

  try {
    const procedure = getRouter(appRouter as AnyRouter, operation.path);
    if (!procedure) {
      return toolError("internal_server_error", "Unknown tool.");
    }

    const input = {
      ...args,
      ...TOOL_OVERRIDES[operation.route.operationId ?? ""]?.forceInput,
    };

    let result: unknown = await call(procedure as AnyProcedure, input, {
      context,
    });

    // detailed-output procedures (chat) wrap the payload in {status, body}
    if (operation.route.outputStructure === "detailed") {
      result = (result as { body: unknown }).body;
    }

    // 204-style deletes resolve void; give the agent an explicit ack
    return toolSuccess(result === undefined ? { success: true } : result);
  } catch (error) {
    // same mapping as the REST error envelope (AgentsetApiError, zod 422s,
    // Prisma not-found), minus the doc_url
    const { body } = toLegacyErrorParts(error);
    return toolError(body.error.code, body.error.message);
  }
};

export const registerTools = (server: McpServer) => {
  for (const operation of collectOperations()) {
    const method = operation.route.method ?? "POST";

    server.registerTool(
      operation.name,
      {
        title: operation.route.summary,
        description: operation.route.description,
        ...(operation.inputShape && { inputSchema: operation.inputShape }),
        annotations: {
          readOnlyHint: method === "GET",
          destructiveHint: method === "DELETE",
          idempotentHint: method !== "POST",
        },
      },
      (operation.inputShape
        ? (args: Record<string, unknown>, extra: ToolExtra) =>
            runProcedure(operation, args, extra)
        : (extra: ToolExtra) =>
            runProcedure(operation, undefined, extra)) as never,
    );
  }
};
