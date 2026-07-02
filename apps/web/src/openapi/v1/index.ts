import type { ZodOpenApiPathsObject } from "zod-openapi";

import { apiKeysPaths } from "./api-keys";
import { chatPaths } from "./chat";
import { documentsPaths } from "./documents";
import { hostingPaths } from "./hosting";
import { ingestJobsPaths } from "./ingest-jobs";
import { namespacesPaths } from "./namespaces";
import { organizationPaths } from "./organization";
import { searchPaths } from "./search";
import { uploadsPaths } from "./uploads";
import { warmUpPaths } from "./warm-up";
import { webhooksPaths } from "./webhooks";

export const v1Paths: ZodOpenApiPathsObject = {
  ...namespacesPaths,
  ...ingestJobsPaths,
  ...documentsPaths,
  ...searchPaths,
  ...chatPaths,
  ...uploadsPaths,
  ...hostingPaths,
  ...warmUpPaths,
  ...webhooksPaths,
  ...organizationPaths,
  ...apiKeysPaths,
};
