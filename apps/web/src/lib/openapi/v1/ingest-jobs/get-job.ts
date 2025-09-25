import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { IngestJobSchema } from "@/schemas/api/ingest-job";
import { tenantHeaderSchema } from "@/schemas/api/tenant";

import {
  jobIdRequestParamSchema,
  namespaceIdRequestParamSchema,
} from "../utils";

export const getIngestJobInfo: ZodOpenApiOperationObject = {
  operationId: "getIngestJobInfo",
  "x-speakeasy-name-override": "get",
  "x-speakeasy-group": "ingestJobs",
  summary: "Retrieve an ingest job",
  description: "Retrieve the info for an ingest job.",
  requestParams: {
    path: namespaceIdRequestParamSchema.extend(jobIdRequestParamSchema.shape),
    header: tenantHeaderSchema,
  },
  responses: {
    "200": {
      description: "The retrieved ingest job",
      content: {
        "application/json": {
          schema: successSchema(IngestJobSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Ingest Jobs"],
  security: [{ token: [] }],
};
