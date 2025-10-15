import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { HostingSchema } from "@/schemas/api/hosting";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const getHosting: ZodOpenApiOperationObject = {
  operationId: "getHosting",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve hosting configuration",
  description: "Retrieve the hosting configuration for a namespace.",
  parameters: [namespaceIdPathSchema],
  responses: {
    "200": {
      description: "The hosting configuration",
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
const hosting = await ns.hosting.get();
console.log(hosting);
`,
  ),
};
