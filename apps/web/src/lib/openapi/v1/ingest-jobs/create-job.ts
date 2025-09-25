import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import {
  createIngestJobSchema,
  IngestJobSchema,
} from "@/schemas/api/ingest-job";
import { tenantHeaderSchema } from "@/schemas/api/tenant";

import { namespaceIdRequestParamSchema } from "../utils";

export const createIngestJob: ZodOpenApiOperationObject = {
  operationId: "createIngestJob",
  "x-speakeasy-name-override": "create",
  summary: "Create an ingest job",
  description: "Create an ingest job for the authenticated organization.",
  requestParams: {
    path: namespaceIdRequestParamSchema,
    header: tenantHeaderSchema,
  },
  requestBody: {
    content: {
      "application/json": { schema: createIngestJobSchema },
    },
  },
  responses: {
    "201": {
      description: "The created ingest job",
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
