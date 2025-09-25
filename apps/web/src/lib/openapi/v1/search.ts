import type {
  ZodOpenApiOperationObject,
  ZodOpenApiPathsObject,
} from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { NodeSchema } from "@/schemas/api/node";
import { queryVectorStoreSchema } from "@/schemas/api/query";
import { tenantHeaderSchema } from "@/schemas/api/tenant";
import { z } from "zod/v4";

import { namespaceIdRequestParamSchema } from "./utils";

export const search: ZodOpenApiOperationObject = {
  operationId: "search",
  "x-speakeasy-name-override": "search",
  summary: "Search a namespace",
  description: "Search a namespace for a query.",
  requestParams: {
    path: namespaceIdRequestParamSchema,
    header: tenantHeaderSchema,
  },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: queryVectorStoreSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The retrieved namespace",
      content: {
        "application/json": {
          schema: successSchema(z.array(NodeSchema)),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Search"],
  security: [{ token: [] }],
};

export const searchPaths: ZodOpenApiPathsObject = {
  "/v1/namespace/{namespaceId}/search": {
    post: search,
  },
};
