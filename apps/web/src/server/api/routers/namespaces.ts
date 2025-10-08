import type { ProtectedProcedureContext } from "@/server/api/trpc";
import { createNamespaceSchema } from "@/schemas/api/namespace";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { deleteNamespace } from "@/services/namespaces/delete";
import {
  validateEmbeddingModel,
  validateVectorStoreConfig,
} from "@/services/namespaces/validate";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { NamespaceStatus } from "@agentset/db";

const validateIsMember = async (
  ctx: ProtectedProcedureContext,
  orgId: string | { slug: string },
  roles?: string[],
) => {
  const member = await ctx.db.member.findFirst({
    where: {
      userId: ctx.session.user.id,
      ...(typeof orgId === "string"
        ? { organizationId: orgId }
        : {
            organization: {
              slug: orgId.slug,
            },
          }),
    },
    select: {
      id: true,
      role: true,
      organizationId: true,
    },
  });

  if (!member) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (roles && !roles.includes(member.role)) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return member;
};

export const namespaceRouter = createTRPCRouter({
  getOrgNamespaces: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const member = await validateIsMember(ctx, { slug: input.slug });

      const namespaces = await ctx.db.namespace.findMany({
        where: {
          organizationId: member.organizationId,
          status: NamespaceStatus.ACTIVE,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return namespaces;
    }),
  getNamespaceBySlug: protectedProcedure
    .input(z.object({ orgSlug: z.string(), slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const namespace = await ctx.db.namespace.findFirst({
        where: {
          slug: input.slug,
          organization: {
            slug: input.orgSlug,
            members: { some: { userId: ctx.session.user.id } },
          },
          status: NamespaceStatus.ACTIVE,
        },
      });

      return namespace;
    }),
  getOnboardingStatus: protectedProcedure
    .input(z.object({ orgSlug: z.string(), slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const namespace = await ctx.db.namespace.findFirst({
        where: {
          slug: input.slug,
          organization: {
            slug: input.orgSlug,
            members: { some: { userId: ctx.session.user.id } },
          },
          status: NamespaceStatus.ACTIVE,
        },
        select: {
          totalIngestJobs: true,
          totalPlaygroundUsage: true,
          organization: {
            select: {
              apiKeys: {
                take: 1,
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!namespace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        ingestDocuments: namespace.totalIngestJobs > 0,
        playground: namespace.totalPlaygroundUsage > 0,
        createApiKey: namespace.organization.apiKeys.length > 0,
      };
    }),
  checkSlug: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        slug: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const namespace = await ctx.db.namespace.findUnique({
        where: {
          organizationId_slug: {
            slug: input.slug,
            organizationId: input.orgId,
          },
        },
      });

      return !!namespace;
    }),
  createNamespace: protectedProcedure
    .input(
      createNamespaceSchema.extend(
        z.object({
          orgId: z.string(),
        }).shape,
      ),
    )
    .mutation(async ({ ctx, input }) => {
      await validateIsMember(ctx, input.orgId, ["admin", "owner"]);

      const { success: isValidEmbedding, error: embeddingError } =
        await validateEmbeddingModel(input.embeddingConfig);
      if (!isValidEmbedding) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: embeddingError,
        });
      }

      const { success: isValidVectorStore, error: vectorStoreError } =
        await validateVectorStoreConfig(
          input.vectorStoreConfig,
          input.embeddingConfig,
        );
      if (!isValidVectorStore) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: vectorStoreError,
        });
      }

      const [namespace] = await ctx.db.$transaction([
        ctx.db.namespace.create({
          data: {
            name: input.name,
            slug: input.slug,
            organizationId: input.orgId,
            embeddingConfig: input.embeddingConfig,
            vectorStoreConfig: input.vectorStoreConfig,
          },
        }),
        ctx.db.organization.update({
          where: { id: input.orgId },
          data: { totalNamespaces: { increment: 1 } },
        }),
      ]);

      return namespace;
    }),
  deleteNamespace: protectedProcedure
    .input(
      z.object({
        namespaceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const namespace = await ctx.db.namespace.findFirst({
        where: {
          id: input.namespaceId,
          organization: {
            members: {
              some: {
                userId: ctx.session.user.id,
                role: {
                  in: ["admin", "owner"],
                },
              },
            },
          },
          status: NamespaceStatus.ACTIVE,
        },
        select: {
          id: true,
          organizationId: true,
        },
      });

      if (!namespace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Namespace not found or you don't have permission to delete it",
        });
      }

      await deleteNamespace({ namespaceId: namespace.id });

      return { success: true };
    }),
});
