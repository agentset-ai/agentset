/**
 * Public API oRPC Root Router
 *
 * Aggregates all public API routers.
 */

import { documentsRouter } from "./routers/documents";
import { hostingRouter } from "./routers/hosting";
import { ingestJobsRouter } from "./routers/ingest-jobs";
import { namespaceRouter } from "./routers/namespaces";
import { uploadsRouter } from "./routers/uploads";

export const publicApiRouter = {
  namespace: namespaceRouter,
  documents: documentsRouter,
  hosting: hostingRouter,
  ingestJobs: ingestJobsRouter,
  uploads: uploadsRouter,
};

export type PublicApiRouter = typeof publicApiRouter;
