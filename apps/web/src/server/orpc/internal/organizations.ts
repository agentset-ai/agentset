import { protectedProcedure } from "@/server/orpc/base";
import { deleteOrganization } from "@/services/organizations/delete";
import { getOrganizationMembers } from "@/services/organizations/members";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { OrganizationStatus } from "@agentset/db";
import { db } from "@agentset/db/client";

export const organizationsRouter = {
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
