import { apiKeysRouter } from "./api-keys";
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
 * The public v1 REST surface (api.agentset.ai/v1). Routing is driven entirely
 * by each procedure's `.route({ method, path })` — the nesting here is
 * organizational only.
 */
export const publicRouter = {
  organization: organizationRouter,
  apiKeys: apiKeysRouter,
  namespaces: namespacesRouter,
  documents: documentsRouter,
  ingestJobs: ingestJobsRouter,
  uploads: uploadsRouter,
  search: searchRouter,
  chat: chatRouter,
  warmUp: warmUpRouter,
  hosting: hostingRouter,
  webhooks: webhooksRouter,
};

export type PublicRouter = typeof publicRouter;
