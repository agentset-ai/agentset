import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses } from "@/openapi/responses";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const deleteHosting: ZodOpenApiOperationObject = {
  operationId: "deleteHosting",
  "x-speakeasy-name-override": "delete",
  summary: "Delete hosting configuration",
  description:
    "Delete the hosting configuration for a namespace. Also removes the attached custom domain, if any.",
  parameters: [namespaceIdPathSchema],
  responses: {
    "204": {
      description: "The hosting configuration was deleted",
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
