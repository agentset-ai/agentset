import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import {
  OrganizationSchema,
  updateOrganizationSchema,
} from "@/schemas/api/organization";

import { makeCodeSamples, ts } from "../code-samples";

export const updateOrganization: ZodOpenApiOperationObject = {
  operationId: "updateOrganization",
  "x-speakeasy-name-override": "update",
  summary: "Update the organization",
  description:
    "Update the name and/or slug of the organization associated with the API key.",
  requestBody: {
    required: true,
    content: {
      "application/json": { schema: updateOrganizationSchema },
    },
  },
  responses: {
    "200": {
      description: "The updated organization",
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
const organization = await agentset.organization.update({
  name: "My Organization",
});
console.log(organization);
`,
    { isNs: false },
  ),
};
