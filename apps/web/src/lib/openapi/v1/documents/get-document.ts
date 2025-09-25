import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { DocumentSchema } from "@/schemas/api/document";
import { tenantHeaderSchema } from "@/schemas/api/tenant";

import {
  documentIdRequestParamSchema,
  namespaceIdRequestParamSchema,
} from "../utils";

export const getDocument: ZodOpenApiOperationObject = {
  operationId: "getDocument",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve a document",
  description: "Retrieve the info for a document.",
  requestParams: {
    path: namespaceIdRequestParamSchema.extend(
      documentIdRequestParamSchema.shape,
    ),
    header: tenantHeaderSchema,
  },
  responses: {
    "200": {
      description: "The retrieved ingest job",
      content: {
        "application/json": {
          schema: successSchema(DocumentSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Documents"],
  security: [{ token: [] }],
};
