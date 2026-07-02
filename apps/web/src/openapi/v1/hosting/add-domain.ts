import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { addDomainSchema, DomainSchema } from "@/schemas/api/hosting";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const addDomain: ZodOpenApiOperationObject = {
  operationId: "addDomain",
  "x-speakeasy-name-override": "addDomain",
  "x-speakeasy-max-method-params": 1,
  summary: "Add a custom domain",
  description:
    "Attach a custom domain to the hosting configuration of a namespace. Only one domain can be attached at a time.",
  parameters: [namespaceIdPathSchema],
  requestBody: {
    required: true,
    content: {
      "application/json": { schema: addDomainSchema },
    },
  },
  responses: {
    "201": {
      description: "The added domain",
      content: {
        "application/json": {
          schema: successSchema(DomainSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Hosting"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
const domain = await ns.hosting.addDomain({ domain: "docs.example.com" });
console.log(domain);
`,
  ),
};
