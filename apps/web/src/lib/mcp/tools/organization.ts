import { AgentsetApiError } from "@/lib/api/errors";
import { runTool } from "@/lib/mcp/run-tool";
import {
  OrganizationMembersSchema,
  updateOrganizationSchema,
} from "@/schemas/api/organization";
import {
  getOrganization,
  toOrganizationResponse,
} from "@/services/organizations/get";
import { getOrganizationMembers } from "@/services/organizations/members";
import { updateOrganization } from "@/services/organizations/update";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const registerOrganizationTools = (server: McpServer) => {
  server.registerTool(
    "get_organization",
    {
      title: "Get organization",
      description:
        "Get the organization that owns the current API key, including its plan, search usage/limits, page usage/limits, and API rate limit. Use this to check remaining quota before running searches or ingesting documents.",
    },
    async (extra) =>
      runTool(extra, async (ctx) => {
        const org = await getOrganization({
          organizationId: ctx.organizationId,
        });

        if (!org) {
          throw new AgentsetApiError({
            code: "not_found",
            message: "Organization not found.",
          });
        }

        return toOrganizationResponse(org);
      }),
  );

  server.registerTool(
    "update_organization",
    {
      title: "Update organization",
      description:
        "Update the organization's name and/or slug. At least one field must be provided. The slug must be unique across Agentset.",
      inputSchema: updateOrganizationSchema.shape,
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        // the schema-level refine doesn't survive .shape spreading
        if (args.name === undefined && args.slug === undefined) {
          throw new AgentsetApiError({
            code: "bad_request",
            message: "At least one field must be provided",
          });
        }

        const updatedOrganization = await updateOrganization({
          organizationId: ctx.organizationId,
          name: args.name,
          slug: args.slug,
        });

        return toOrganizationResponse(updatedOrganization);
      }),
  );

  server.registerTool(
    "list_members",
    {
      title: "List organization members",
      description:
        "List the members of the organization and its pending invitations.",
    },
    async (extra) =>
      runTool(extra, async (ctx) => {
        const members = await getOrganizationMembers({
          organizationId: ctx.organizationId,
        });

        if (!members) {
          throw new AgentsetApiError({
            code: "not_found",
            message: "Organization not found.",
          });
        }

        return OrganizationMembersSchema.parse(members);
      }),
  );
};
