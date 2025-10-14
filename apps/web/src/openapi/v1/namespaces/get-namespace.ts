import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { NamespaceSchema } from "@/schemas/api/namespace";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const getNamespace: ZodOpenApiOperationObject = {
  operationId: "getNamespace",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve a namespace",
  description: "Retrieve the info for a namespace.",
  parameters: [namespaceIdPathSchema],
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
  ...makeCodeSamples(
    ts`
const namespace = await agentset.namespaces.get("ns_xxx");
console.log(namespace);
`,
    { isNs: false },
  ),
};
