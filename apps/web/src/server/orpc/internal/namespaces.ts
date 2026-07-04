import type { ProtectedContext } from "@/server/orpc/base";
import { createNamespaceSchema } from "@/schemas/api/namespace";
import { protectedProcedure } from "@/server/orpc/base";
import { createNamespace } from "@/services/namespaces/create";
import { deleteNamespace } from "@/services/namespaces/delete";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { NamespaceStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { getDemoTemplate } from "@agentset/demo";
import { triggerSeedDemoNamespace } from "@agentset/jobs";

const validateIsMember = async (
  ctx: Pick<ProtectedContext, "session">,
  orgId: string | { slug: string },
  roles?: string[],
) => {
  const member = await db.member.findFirst({
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
    throw new ORPCError("UNAUTHORIZED");
  }

  if (roles && !roles.includes(member.role)) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return member;
};

export const namespacesRouter = {
  getOrgNamespaces: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const member = await validateIsMember(context, { slug: input.slug });

      const namespaces = await db.namespace.findMany({
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
    .handler(async ({ context, input }) => {
      const namespace = await db.namespace.findFirst({
        where: {
          slug: input.slug,
          organization: {
            slug: input.orgSlug,
            members: { some: { userId: context.session.user.id } },
          },
          status: NamespaceStatus.ACTIVE,
        },
      });

      return namespace;
    }),
  getOnboardingStatus: protectedProcedure
    .input(z.object({ orgSlug: z.string(), slug: z.string() }))
    .handler(async ({ context, input }) => {
      const namespace = await db.namespace.findFirst({
        where: {
          slug: input.slug,
          organization: {
            slug: input.orgSlug,
            members: { some: { userId: context.session.user.id } },
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
        throw new ORPCError("NOT_FOUND");
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
    .handler(async ({ input }) => {
      const namespace = await db.namespace.findUnique({
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
    .handler(async ({ context, input: { orgId, ...data } }) => {
      await validateIsMember(context, orgId, ["admin", "owner"]);

      return await createNamespace({
        organizationId: orgId,
        data,
      });
    }),
  createDemoNamespace: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        templateId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      await validateIsMember(context, input.orgId, ["admin", "owner"]);

      const template = getDemoTemplate(input.templateId);
      if (!template) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Invalid template ID",
        });
      }

      const organization = await db.organization.findUnique({
        where: { id: input.orgId },
        select: { id: true, plan: true },
      });
      if (!organization) {
        throw new ORPCError("NOT_FOUND");
      }

      let slug: string = template.id;
      let suffix = 2;
      while (true) {
        const existing = await db.namespace.findUnique({
          where: {
            organizationId_slug: {
              organizationId: input.orgId,
              slug,
            },
          },
          select: { id: true },
        });

        if (!existing) break;

        slug = `${template.id}-${suffix}`;
        suffix += 1;
      }

      const [namespace] = await db.$transaction([
        db.namespace.create({
          data: {
            name: template.name,
            slug,
            demoId: template.id,
            organizationId: input.orgId,
            embeddingConfig: {
              provider: "MANAGED_OPENAI",
              model: "text-embedding-3-large",
            },
            vectorStoreConfig: {
              provider: "MANAGED_TURBOPUFFER",
            },
          },
        }),
        db.organization.update({
          where: { id: input.orgId },
          data: {
            totalNamespaces: { increment: 1 },
          },
        }),
      ]);

      await triggerSeedDemoNamespace(
        {
          namespaceId: namespace.id,
          organizationId: organization.id,
          templateId: template.id,
        },
        organization.plan,
      );

      return namespace;
    }),
  deleteNamespace: protectedProcedure
    .input(
      z.object({
        namespaceId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const namespace = await db.namespace.findFirst({
        where: {
          id: input.namespaceId,
          organization: {
            members: {
              some: {
                userId: context.session.user.id,
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
        throw new ORPCError("NOT_FOUND", {
          message:
            "Namespace not found or you don't have permission to delete it",
        });
      }

      await deleteNamespace({ namespaceId: namespace.id });

      return { success: true };
    }),
};
