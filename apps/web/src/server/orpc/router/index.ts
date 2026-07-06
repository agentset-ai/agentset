import { apiKeysRouter } from "./api-keys";
import { billingRouter } from "./billing";
import { chatRouter } from "./chat";
import { documentsRouter } from "./documents";
import { hostingRouter } from "./hosting";
import { ingestJobsRouter } from "./ingest-jobs";
import { namespacesRouter } from "./namespaces";
import { organizationRouter } from "./organization";
import { searchRouter } from "./search";
import { uploadsRouter } from "./uploads";
import { warmUpRouter } from "./warm-up";
import { webhooksRouter } from "./webhooks";

/**
 * The single app router, served on three surfaces:
 * - dashboard RPC (`/api/rpc`, RPCHandler) — session auth; sees everything
 * - public REST (`api.agentset.ai/v1`, OpenAPIHandler) — procedures with
 *   `.route()` metadata only; routing is driven by each procedure's
 *   `{ method, path }`, so the nesting here is organizational
 * - MCP (`/api/mcp`) — tools generated from the procedures that carry an
 *   operationId (the published OpenAPI operations)
 *
 * Mount names match the old dashboard router so client query keys keep their
 * path segments. Mount ORDER matches the old public router: the OpenAPI
 * generator emits paths in traversal order, and the published document must
 * not reorder.
 */
export const appRouter = {
  organization: organizationRouter,
  apiKey: apiKeysRouter,
  namespace: namespacesRouter,
  document: documentsRouter,
  ingestJob: ingestJobsRouter,
  upload: uploadsRouter,
  search: searchRouter,
  chat: chatRouter,
  warmUp: warmUpRouter,
  hosting: hostingRouter,
  webhook: webhooksRouter,
  billing: billingRouter,
};

export type AppRouter = typeof appRouter;
