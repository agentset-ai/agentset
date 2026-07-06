import { AgentsetApiError } from "@/lib/api/errors";
import {
  OrganizationMembersSchema,
  OrganizationSchema,
  updateOrganizationSchema,
} from "@/schemas/api/organization";
import { api, protectedProcedure, successSchema } from "@/server/orpc/base";
import { deleteOrganization } from "@/services/organizations/delete";
import {
  getOrganization,
  toOrganizationResponse,
} from "@/services/organizations/get";
import { getOrganizationMembers } from "@/services/organizations/members";
import { updateOrganization } from "@/services/organizations/update";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { OrganizationStatus } from "@agentset/db";
import { db } from "@agentset/db/client";

import { makeCodeSamples, ts } from "./code-samples";

const get = api
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

const updateHandler = api
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

const listMembers = api
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
  // shared (REST + MCP + dashboard)
  get,
  update,
  updatePut,
  listMembers,

  // dashboard-only (session, no .route() — never on REST/OpenAPI/MCP)
  all: protectedProcedure.handler(async ({ context }) => {
    const orgs = await db.organization.findMany({
      where: {
        members: {
          some: {
            userId: context.session.user.id,
          },
        },
        status: OrganizationStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        logo: true,
        namespaces: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return orgs;
  }),
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .handler(async ({ context, input }) => {
      const org = await db.organization.findUnique({
        where: {
          slug: input.slug,
          members: {
            some: {
              userId: context.session.user.id,
            },
          },
        },
        include: {
          members: {
            where: {
              userId: context.session.user.id,
            },
            take: 1,
            select: {
              id: true,
              role: true,
            },
          },
        },
      });

      if (!org) {
        throw new ORPCError("NOT_FOUND");
      }

      const { members } = org;
      const isAdmin =
        members[0]?.role === "admin" || members[0]?.role === "owner";

      return {
        ...org,
        isAdmin,
        isOwner: members[0]?.role === "owner",
        currentMemberId: members[0]?.id,
      };
    }),
  members: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const members = await getOrganizationMembers({
        organizationId: input.organizationId,
        userId: context.session.user.id,
      });

      return members;
    }),
  delete: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const org = await db.organization.findUnique({
        where: {
          id: input.organizationId,
          members: {
            some: {
              userId: context.session.user.id,
              role: { in: ["admin", "owner"] },
            },
          },
        },
      });

      if (!org) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "You are not authorized to delete this organization",
        });
      }

      if (org.status === OrganizationStatus.DELETING) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Organization is already being deleted",
        });
      }

      await deleteOrganization({ organizationId: org.id });
    }),
};
