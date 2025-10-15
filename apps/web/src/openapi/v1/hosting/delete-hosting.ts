import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { HostingSchema } from "@/schemas/api/hosting";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const deleteHosting: ZodOpenApiOperationObject = {
  operationId: "deleteHosting",
  "x-speakeasy-name-override": "delete",
  summary: "Delete hosting configuration",
  description: "Delete the hosting configuration for a namespace.",
  parameters: [namespaceIdPathSchema],
  responses: {
    "204": {
      description: "The deleted hosting configuration",
      content: {
        "application/json": {
          schema: successSchema(HostingSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Hosting"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
await ns.hosting.delete();
console.log("Hosting deleted");
`,
  ),
};
