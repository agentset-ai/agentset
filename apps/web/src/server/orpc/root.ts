/**
 * oRPC Root Router
 *
 * Aggregates all oRPC routers.
 * All routers use the shared service layer.
 */

import { apiKeysRouter } from "./routers/api-keys";
import { benchmarkRouter } from "./routers/benchmark";
import { billingRouter } from "./routers/billing";
import { documentsRouter } from "./routers/documents";
import { domainsRouter } from "./routers/domains";
import { hostingRouter } from "./routers/hosting";
import { ingestJobRouter } from "./routers/ingest-jobs";
import { namespaceRouter } from "./routers/namespaces";
import { organizationsRouter } from "./routers/organizations";
import { searchRouter } from "./routers/search";
import { uploadsRouter } from "./routers/uploads";

export const appRouter = {
  search: searchRouter,
  document: documentsRouter,
  namespace: namespaceRouter,
  hosting: hostingRouter,
  upload: uploadsRouter,
  ingestJob: ingestJobRouter,
  organization: organizationsRouter,
  apiKey: apiKeysRouter,
  domain: domainsRouter,
  billing: billingRouter,
  benchmark: benchmarkRouter,
};

export type AppRouter = typeof appRouter;
