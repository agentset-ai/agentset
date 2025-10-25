import type {
  ZodOpenApiOperationObject,
  ZodOpenApiPathsObject,
} from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { z } from "zod/v4";

import { makeCodeSamples, ts } from "./code-samples";
import { namespaceIdPathSchema, tenantHeaderSchema } from "./utils";

export const warmUp: ZodOpenApiOperationObject = {
  operationId: "warmUp",
  "x-speakeasy-name-override": "warmUp",
  "x-speakeasy-group": "namespace",
  summary: "Warm cache for a namespace",
  description:
    "Pre-loads the namespace into the vector store's cache for faster query performance. Not all vector stores support this operation. Currently only Turbopuffer supports this operation.",
  parameters: [namespaceIdPathSchema, tenantHeaderSchema],
  responses: {
    "200": {
      description: "Cache warming started",
      content: {
        "application/json": {
          schema: successSchema(
            z.object({
              status: z.boolean(),
            }),
          ),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Namespaces"],
  security: [{ token: [] }],
  ...makeCodeSamples(ts`
await ns.warmUp();
console.log("Cache warmed successfully");
`),
};

export const warmUpPaths: ZodOpenApiPathsObject = {
  "/v1/namespace/{namespaceId}/warm-up": {
    post: warmUp,
  },
};
