import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { IngestJobSchema } from "@/schemas/api/ingest-job";
import { tenantHeaderSchema } from "@/schemas/api/tenant";
import { z } from "zod/v4";

export const getIngestJobInfo: ZodOpenApiOperationObject = {
  operationId: "getIngestJobInfo",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve an ingest job",
  description: "Retrieve the info for an ingest job.",
  requestParams: {
    path: z.object({
      namespaceId: z.string().describe("The id of the namespace to retrieve."),
      jobId: z.string().describe("The id of the ingest job to retrieve."),
    }),
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
