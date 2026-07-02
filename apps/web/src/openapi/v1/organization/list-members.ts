import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { OrganizationMembersSchema } from "@/schemas/api/organization";

import { makeCodeSamples, ts } from "../code-samples";

export const listOrganizationMembers: ZodOpenApiOperationObject = {
  operationId: "listOrganizationMembers",
  "x-speakeasy-name-override": "members",
  summary: "Retrieve the organization members",
  description:
    "Retrieve the members and pending invitations of the organization associated with the API key.",
  responses: {
    "200": {
      description: "The retrieved members and pending invitations",
      content: {
        "application/json": {
          schema: successSchema(OrganizationMembersSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Organization"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
const members = await agentset.organization.members();
console.log(members);
`,
    { isNs: false },
  ),
};
