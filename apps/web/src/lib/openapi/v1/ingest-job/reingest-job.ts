import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { IngestJobSchema } from "@/schemas/api/ingest-job";
import { tenantHeaderSchema } from "@/schemas/api/tenant";
import { z } from "zod/v4";

export const reingestIngestJob: ZodOpenApiOperationObject = {
  operationId: "reingestIngestJob",
  "x-speakeasy-name-override": "re-ingest",
  "x-speakeasy-max-method-params": 1,
  summary: "Re-ingest an ingest job",
  description: "Re-ingest an ingest job for the authenticated organization.",
  requestParams: {
    path: z.object({
      namespaceId: z.string().describe("The id of the namespace to re-ingest."),
      jobId: z.string().describe("The id of the ingest job to re-ingest."),
    }),
    header: tenantHeaderSchema,
  },
  responses: {
    "200": {
      description: "The re-ingested ingest job",
      content: {
        "application/json": {
          schema: successSchema(IngestJobSchema.pick({ id: true })),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Ingest Jobs"],
  security: [{ token: [] }],
};
