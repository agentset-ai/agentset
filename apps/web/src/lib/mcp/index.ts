import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerApiKeyTools } from "./tools/api-keys";
import { registerChatTools } from "./tools/chat";
import { registerDocumentTools } from "./tools/documents";
import { registerHostingTools } from "./tools/hosting";
import { registerIngestionTools } from "./tools/ingestion";
import { registerNamespaceTools } from "./tools/namespaces";
import { registerOrganizationTools } from "./tools/organization";
import { registerSearchTools } from "./tools/search";
import { registerWebhookTools } from "./tools/webhooks";

export const MCP_SERVER_INFO = {
  name: "agentset",
  version: "1.0.0",
};

export const MCP_SERVER_INSTRUCTIONS = `Agentset is a RAG-as-a-service platform. This server operates one organization, determined by the API key.

Standard flow to make documents searchable:
1. create_namespace (or list_namespaces to find an existing one).
2. create_upload_urls for local files, then PUT each file's bytes to its presigned URL. Skip this step for raw text, public file URLs, websites, or YouTube videos.
3. create_ingest_job with the matching payload type (MANAGED_FILE keys from step 2, TEXT, FILE, CRAWL, YOUTUBE, or BATCH).
4. Poll get_ingest_job until the status is COMPLETED (or check list_documents).
5. search for raw chunks, or chat for a generated answer with sources.

Multi-tenant partitioning: pass an \`x-tenant-id\` HTTP header on the MCP connection to scope ingestion, documents, search, and chat to that tenant.

Optionally, enable_hosting publishes a shareable chat/search page for a namespace; update_hosting customizes it and set_custom_domain attaches your own domain.

IDs are prefixed (org_, ns_, job_, doc_) and tools accept them with or without the prefix. Errors are returned as JSON: {"error": {"code", "message"}}.`;

export const registerTools = (server: McpServer) => {
  registerOrganizationTools(server);
  registerApiKeyTools(server);
  registerNamespaceTools(server);
  registerIngestionTools(server);
  registerDocumentTools(server);
  registerSearchTools(server);
  registerChatTools(server);
  registerHostingTools(server);
  registerWebhookTools(server);
};
