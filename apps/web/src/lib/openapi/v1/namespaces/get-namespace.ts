import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { NamespaceSchema } from "@/schemas/api/namespace";

import { namespaceIdRequestParamSchema } from "../utils";

export const getNamespace: ZodOpenApiOperationObject = {
  operationId: "getNamespace",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve a namespace",
  description: "Retrieve the info for a namespace.",
  requestParams: {
    path: namespaceIdRequestParamSchema,
  },
  responses: {
    "200": {
      description: "The retrieved namespace",
      content: {
        "application/json": {
          schema: successSchema(NamespaceSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Namespaces"],
  security: [{ token: [] }],
};
