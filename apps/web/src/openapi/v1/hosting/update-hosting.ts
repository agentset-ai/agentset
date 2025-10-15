import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { HostingSchema, updateHostingSchema } from "@/schemas/api/hosting";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const updateHosting: ZodOpenApiOperationObject = {
  operationId: "updateHosting",
  "x-speakeasy-name-override": "update",
  "x-speakeasy-max-method-params": 1,
  summary: "Update hosting configuration",
  description:
    "Update the hosting configuration for a namespace. If there is no change, return it as it is.",
  parameters: [namespaceIdPathSchema],
  requestBody: {
    required: true,
    content: {
      "application/json": { schema: updateHostingSchema },
    },
  },
  responses: {
    "200": {
      description: "The updated hosting configuration",
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
const updatedHosting = await ns.hosting.update({
  title: "My Knowledge Base",
  welcomeMessage: "Welcome to my knowledge base!",
  searchEnabled: true,
});
console.log(updatedHosting);
`,
  ),
};
