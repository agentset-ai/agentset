import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { OrganizationSchema } from "@/schemas/api/organization";

import { makeCodeSamples, ts } from "../code-samples";

export const getOrganization: ZodOpenApiOperationObject = {
  operationId: "getOrganization",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve the organization",
  description:
    "Retrieve the organization associated with the API key, including its usage and limits.",
  responses: {
    "200": {
      description: "The retrieved organization",
      content: {
        "application/json": {
          schema: successSchema(OrganizationSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Organization"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
const organization = await agentset.organization.get();
console.log(organization);
`,
    { isNs: false },
  ),
};
