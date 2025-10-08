import { deleteOrganization } from "@/services/organizations/delete";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { OrganizationStatus } from "@agentset/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const organizationsRouter = createTRPCRouter({
  all: protectedProcedure.query(async ({ ctx }) => {
    const orgs = await ctx.db.organization.findMany({
      where: {
        members: {
          some: {
            userId: ctx.session.user.id,
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
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: {
          slug: input.slug,
          members: {
            some: {
              userId: ctx.session.user.id,
            },
          },
        },
        include: {
          members: {
            where: {
              userId: ctx.session.user.id,
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
        throw new TRPCError({ code: "NOT_FOUND" });
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
    .query(async ({ ctx, input }) => {
      const members = await ctx.db.organization.findUnique({
        where: {
          id: input.organizationId,
          members: {
            some: {
              userId: ctx.session.user.id,
            },
          },
        },
        select: {
          members: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          invitations: {
            where: {
              status: "pending",
            },
          },
        },
      });

      return members;
    }),
  delete: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: {
          id: input.organizationId,
          members: {
            some: {
              userId: ctx.session.user.id,
              role: { in: ["admin", "owner"] },
            },
          },
        },
      });

      if (!org) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to delete this organization",
        });
      }

      if (org.status === OrganizationStatus.DELETING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization is already being deleted",
        });
      }

      await deleteOrganization({ organizationId: org.id });
    }),
});
