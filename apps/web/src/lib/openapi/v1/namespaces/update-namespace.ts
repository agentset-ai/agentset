import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import {
  NamespaceSchema,
  updateNamespaceSchema,
} from "@/schemas/api/namespace";

import { namespaceIdRequestParamSchema } from "../utils";

export const updateNamespace: ZodOpenApiOperationObject = {
  operationId: "updateNamespace",
  "x-speakeasy-name-override": "update",
  "x-speakeasy-max-method-params": 2,
  summary: "Update a namespace.",
  description:
    "Update a namespace for the authenticated organization. If there is no change, return it as it is.",
  requestParams: {
    path: namespaceIdRequestParamSchema,
  },
  requestBody: {
    content: {
      "application/json": { schema: updateNamespaceSchema },
    },
  },
  responses: {
    "200": {
      description: "The updated namespace",
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
