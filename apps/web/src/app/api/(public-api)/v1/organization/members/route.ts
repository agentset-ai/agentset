import { AgentsetApiError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { OrganizationMembersSchema } from "@/schemas/api/organization";
import { getOrganizationMembers } from "@/services/organizations/members";

export const GET = withApiHandler(
  async ({ organization, headers }) => {
    const members = await getOrganizationMembers({
      organizationId: organization.id,
    });

    if (!members) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Organization not found.",
      });
    }

    return makeApiSuccessResponse({
      data: OrganizationMembersSchema.parse(members),
      headers,
    });
  },
  { logging: { routeName: "GET /v1/organization/members" } },
);
