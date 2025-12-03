import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { NamespaceSchema } from "@/schemas/api/namespace";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const deleteNamespace: ZodOpenApiOperationObject = {
  operationId: "deleteNamespace",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a namespace.",
  description:
    "Delete a namespace for the authenticated organization. This will delete all the data associated with the namespace.",
  parameters: [namespaceIdPathSchema],
  responses: {
    "204": {
      description: "The deleted namespace",
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
await agentset.namespaces.delete("ns_xxx");
console.log("Namespace queued for deletion");
`,
    { isNs: false },
  ),
};
