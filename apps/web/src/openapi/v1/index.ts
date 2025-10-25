import type { ZodOpenApiPathsObject } from "zod-openapi";

import { documentsPaths } from "./documents";
import { hostingPaths } from "./hosting";
import { ingestJobsPaths } from "./ingest-jobs";
import { namespacesPaths } from "./namespaces";
import { searchPaths } from "./search";
import { uploadsPaths } from "./uploads";
import { warmUpPaths } from "./warm-up";

export const v1Paths: ZodOpenApiPathsObject = {
  ...namespacesPaths,
  ...ingestJobsPaths,
  ...documentsPaths,
  ...searchPaths,
  ...uploadsPaths,
  ...hostingPaths,
  ...warmUpPaths,
};
