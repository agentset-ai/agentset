import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

import { apiKeysRouter } from "./routers/api-keys";
import { billingRouter } from "./routers/billing";
import { documentsRouter } from "./routers/documents";
import { ingestJobRouter } from "./routers/ingest-jobs";
import { namespaceRouter } from "./routers/namespaces";
import { organizationsRouter } from "./routers/organizations";
import { uploadsRouter } from "./routers/uploads";

export const appRouter = createTRPCRouter({
  namespace: namespaceRouter,
  apiKey: apiKeysRouter,
  ingestJob: ingestJobRouter,
  document: documentsRouter,
  upload: uploadsRouter,
  billing: billingRouter,
  organization: organizationsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
