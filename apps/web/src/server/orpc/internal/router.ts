import { apiKeysRouter } from "./api-keys";
import { billingRouter } from "./billing";
import { documentsRouter } from "./documents";
import { domainsRouter } from "./domains";
import { hostingRouter } from "./hosting";
import { ingestJobsRouter } from "./ingest-jobs";
import { namespacesRouter } from "./namespaces";
import { organizationsRouter } from "./organizations";
import { searchRouter } from "./search";
import { uploadsRouter } from "./uploads";
import { webhooksRouter } from "./webhooks";

/**
 * The dashboard RPC surface. Mount names intentionally match the old tRPC
 * root router 1:1 so client-side query keys keep the same path segments.
 */
export const internalRouter = {
  namespace: namespacesRouter,
  apiKey: apiKeysRouter,
  ingestJob: ingestJobsRouter,
  document: documentsRouter,
  upload: uploadsRouter,
  billing: billingRouter,
  organization: organizationsRouter,
  hosting: hostingRouter,
  domain: domainsRouter,
  search: searchRouter,
  webhook: webhooksRouter,
};

export type InternalRouter = typeof internalRouter;
