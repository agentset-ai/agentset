import type {
  ZodOpenApiOperationObject,
  ZodOpenApiPathsObject,
} from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { NodeSchema } from "@/schemas/api/node";
import { queryVectorStoreSchema } from "@/schemas/api/query";
import { z } from "zod/v4";

import { makeCodeSamples, ts } from "./code-samples";
import { namespaceIdPathSchema, tenantHeaderSchema } from "./utils";

export const search: ZodOpenApiOperationObject = {
  operationId: "search",
  "x-speakeasy-name-override": "execute",
  "x-speakeasy-group": "search",
  summary: "Search a namespace",
  description: "Search a namespace for a query.",
  parameters: [namespaceIdPathSchema, tenantHeaderSchema],
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
  ...makeCodeSamples(ts`
const results = await ns.search("What is machine learning?", {
  topK: 20,
  rerank: true,
  rerankLimit: 10,
});
console.log(results);
`),
};

export const searchPaths: ZodOpenApiPathsObject = {
  "/v1/namespace/{namespaceId}/search": {
    post: search,
  },
};
