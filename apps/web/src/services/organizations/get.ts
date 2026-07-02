import { OrganizationSchema } from "@/schemas/api/organization";

import { db } from "@agentset/db/client";
import { prefixId } from "@agentset/utils";

export const getOrganization = async ({
  organizationId,
}: {
  organizationId: string;
}) => {
  return await db.organization.findUnique({
    where: {
      id: organizationId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      createdAt: true,
      searchUsage: true,
      searchLimit: true,
      totalPages: true,
      pagesLimit: true,
      apiRatelimit: true,
    },
  });
};

export type OrganizationInfo = NonNullable<
  Awaited<ReturnType<typeof getOrganization>>
>;

// the curated public shape shared by GET/PATCH /v1/organization and the MCP tools
export const toOrganizationResponse = (organization: OrganizationInfo) =>
  OrganizationSchema.parse({
    id: prefixId(organization.id, "org_"),
    name: organization.name,
    slug: organization.slug,
    plan: organization.plan,
    createdAt: organization.createdAt,
    usage: {
      searchUsage: organization.searchUsage,
      searchLimit: organization.searchLimit,
      totalPages: organization.totalPages,
      pagesLimit: organization.pagesLimit,
      apiRatelimit: organization.apiRatelimit,
    },
  });
