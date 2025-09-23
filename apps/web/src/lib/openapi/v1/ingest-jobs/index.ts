import type { ZodOpenApiPathsObject } from "zod-openapi";

import { createIngestJob } from "./create-job";
import { deleteIngestJob } from "./delete-job";
import { getIngestJobInfo } from "./get-job";
import { listIngestJobs } from "./list-jobs";
import { reingestIngestJob } from "./reingest-job";

export const ingestJobsPaths: ZodOpenApiPathsObject = {
  "/v1/namespace/{namespaceId}/ingest-jobs": {
    get: listIngestJobs,
    post: createIngestJob,
  },
  "/v1/namespace/{namespaceId}/ingest-jobs/{jobId}": {
    get: getIngestJobInfo,
    post: reingestIngestJob,
    delete: deleteIngestJob,
  },
};
