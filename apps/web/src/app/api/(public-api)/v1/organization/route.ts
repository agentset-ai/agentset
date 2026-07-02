import { AgentsetApiError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import { updateOrganizationSchema } from "@/schemas/api/organization";
import {
  getOrganization,
  toOrganizationResponse,
} from "@/services/organizations/get";
import { updateOrganization } from "@/services/organizations/update";

export const GET = withApiHandler(
  async ({ organization, headers }) => {
    const org = await getOrganization({ organizationId: organization.id });

    if (!org) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Organization not found.",
      });
    }

    return makeApiSuccessResponse({
      data: toOrganizationResponse(org),
      headers,
    });
  },
  { logging: { routeName: "GET /v1/organization" } },
);

export const PATCH = withApiHandler(
  async ({ organization, headers, req }) => {
    const { name, slug } = await updateOrganizationSchema.parseAsync(
      await parseRequestBody(req),
    );

    const updatedOrganization = await updateOrganization({
      organizationId: organization.id,
      name,
      slug,
    });

    return makeApiSuccessResponse({
      data: toOrganizationResponse(updatedOrganization),
      headers,
    });
  },
  { logging: { routeName: "PATCH /v1/organization" } },
);

export const PUT = PATCH;
