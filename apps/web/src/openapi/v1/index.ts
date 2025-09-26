import type { ZodOpenApiPathsObject } from "zod-openapi";

import { documentsPaths } from "./documents";
import { ingestJobsPaths } from "./ingest-jobs";
import { namespacesPaths } from "./namespaces";
import { searchPaths } from "./search";
import { uploadsPaths } from "./uploads";

export const v1Paths: ZodOpenApiPathsObject = {
  ...namespacesPaths,
  ...ingestJobsPaths,
  ...documentsPaths,
  ...searchPaths,
  ...uploadsPaths,
};
