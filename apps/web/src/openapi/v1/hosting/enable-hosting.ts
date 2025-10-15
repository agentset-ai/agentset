import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { HostingSchema } from "@/schemas/api/hosting";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const enableHosting: ZodOpenApiOperationObject = {
  operationId: "enableHosting",
  "x-speakeasy-name-override": "enable",
  summary: "Enable hosting",
  description: "Enable hosting for a namespace.",
  parameters: [namespaceIdPathSchema],
  responses: {
    "201": {
      description: "The created hosting configuration",
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
const hosting = await ns.hosting.enable();
console.log(hosting);
`,
  ),
};
