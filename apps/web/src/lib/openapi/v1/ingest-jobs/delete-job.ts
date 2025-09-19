import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { IngestJobSchema } from "@/schemas/api/ingest-job";
import { tenantHeaderSchema } from "@/schemas/api/tenant";
import { z } from "zod/v4";

import { namespaceIdSchema } from "../utils";

export const deleteIngestJob: ZodOpenApiOperationObject = {
  operationId: "deleteIngestJob",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete an ingest job",
  description: "Delete an ingest job for the authenticated organization.",
  requestParams: {
    path: z.object({
      namespaceId: namespaceIdSchema,
      jobId: z.string().describe("The id of the ingest job to delete."),
    }),
    header: tenantHeaderSchema,
  },
  responses: {
    "204": {
      description: "The deleted ingest job",
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
