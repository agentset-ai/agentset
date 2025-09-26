import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import {
  NamespaceSchema,
  updateNamespaceSchema,
} from "@/schemas/api/namespace";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const updateNamespace: ZodOpenApiOperationObject = {
  operationId: "updateNamespace",
  "x-speakeasy-name-override": "update",
  "x-speakeasy-max-method-params": 2,
  summary: "Update a namespace.",
  description:
    "Update a namespace for the authenticated organization. If there is no change, return it as it is.",
  parameters: [namespaceIdPathSchema],
  requestBody: {
    required: true,
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
  ...makeCodeSamples(
    ts`
const updatedNamespace = await agentset.namespaces.update("ns_xxx", {
  name: "Updated Knowledge Base",
});
console.log(updatedNamespace);
`,
    { isNs: false },
  ),
};
