import { AgentsetApiError } from "@/lib/api/errors";
import { publicApi, successSchema } from "@/server/orpc/base";
import {
  OrganizationMembersSchema,
  OrganizationSchema,
  updateOrganizationSchema,
} from "@/schemas/api/organization";
import {
  getOrganization,
  toOrganizationResponse,
} from "@/services/organizations/get";
import { getOrganizationMembers } from "@/services/organizations/members";
import { updateOrganization } from "@/services/organizations/update";

import { makeCodeSamples, ts } from "./code-samples";

const get = publicApi
  .route({
    method: "GET",
    path: "/organization",
    operationId: "getOrganization",
    summary: "Retrieve the organization",
    description:
      "Retrieve the organization associated with the API key, including its usage and limits.",
    tags: ["Organization"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "get",
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const organization = await agentset.organization.get();
console.log(organization);
`,
        { isNs: false },
      ),
    }),
  })
  .output(successSchema(OrganizationSchema))
  .handler(async ({ context }) => {
    const org = await getOrganization({
      organizationId: context.organization.id,
    });

    if (!org) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Organization not found.",
      });
    }

    return { success: true as const, data: toOrganizationResponse(org) };
  });

const updateHandler = publicApi
  .input(updateOrganizationSchema)
  .output(successSchema(OrganizationSchema))
  .handler(async ({ context, input }) => {
    const updatedOrganization = await updateOrganization({
      organizationId: context.organization.id,
      name: input.name,
      slug: input.slug,
    });

    return {
      success: true as const,
      data: toOrganizationResponse(updatedOrganization),
    };
  });

const update = updateHandler.route({
  method: "PATCH",
  path: "/organization",
  operationId: "updateOrganization",
  summary: "Update the organization",
  description:
    "Update the name and/or slug of the organization associated with the API key.",
  tags: ["Organization"],
  spec: (current) => ({
    ...current,
    "x-speakeasy-name-override": "update",
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
  }),
});

// legacy wire-compat alias, hidden from the generated spec
const updatePut = updateHandler.route({
  method: "PUT",
  path: "/organization",
  tags: ["internal-alias"],
});

const members = publicApi
  .route({
    method: "GET",
    path: "/organization/members",
    operationId: "listOrganizationMembers",
    summary: "Retrieve the organization members",
    description:
      "Retrieve the members and pending invitations of the organization associated with the API key.",
    tags: ["Organization"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "members",
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const members = await agentset.organization.members();
console.log(members);
`,
        { isNs: false },
      ),
    }),
  })
  .output(successSchema(OrganizationMembersSchema))
  .handler(async ({ context }) => {
    const orgMembers = await getOrganizationMembers({
      organizationId: context.organization.id,
    });

    if (!orgMembers) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Organization not found.",
      });
    }

    return { success: true as const, data: orgMembers };
  });

export const organizationRouter = {
  get,
  update,
  updatePut,
  members,
};
