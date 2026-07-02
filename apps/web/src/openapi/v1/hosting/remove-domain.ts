import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses } from "@/openapi/responses";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const removeDomain: ZodOpenApiOperationObject = {
  operationId: "removeDomain",
  "x-speakeasy-name-override": "removeDomain",
  summary: "Remove the custom domain",
  description:
    "Remove the custom domain attached to the hosting configuration of a namespace.",
  parameters: [namespaceIdPathSchema],
  responses: {
    "204": {
      description: "The domain was removed",
    },
    ...openApiErrorResponses,
  },
  tags: ["Hosting"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
await ns.hosting.removeDomain();
console.log("Domain removed");
`,
  ),
};
