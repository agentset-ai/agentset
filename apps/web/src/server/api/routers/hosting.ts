import type { ProtectedProcedureContext } from "@/server/api/trpc";
import { env } from "@/env";
import { prefixId } from "@/lib/api/ids";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { slugSchema, uploadedImageSchema } from "@/schemas/api/misc";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getCache, waitUntil } from "@vercel/functions";
import { nanoid } from "nanoid";
import { z } from "zod/v4";

import { Prisma } from "@agentset/db";
import { deleteAsset, uploadImage } from "@agentset/storage";

const commonInput = z.object({
  namespaceId: z.string(),
});

const getHosting = async (
  ctx: ProtectedProcedureContext,
  input: z.infer<typeof commonInput>,
) => {
  const hosting = await ctx.db.hosting.findFirst({
    where: {
      namespace: {
        id: input.namespaceId,
        organization: {
          members: { some: { userId: ctx.session.user.id } },
        },
      },
    },
    include: {
      domain: true,
    },
  });

  return hosting ?? null;
};

// TODO: only allow for pro users
export const hostingRouter = createTRPCRouter({
  get: protectedProcedure.input(commonInput).query(async ({ ctx, input }) => {
    return getHosting(ctx, input);
  }),
  enable: protectedProcedure
    .input(commonInput)
    .mutation(async ({ ctx, input }) => {
      const namespace = await ctx.db.namespace.findUnique({
        where: {
          id: input.namespaceId,
          organization: {
            members: { some: { userId: ctx.session.user.id } },
          },
        },
        select: {
          id: true,
          slug: true,
          name: true,
          hosting: true,
          organization: {
            select: {
              id: true,

              slug: true,
            },
          },
        },
      });

      if (!namespace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Namespace not found",
        });
      }

      if (namespace.hosting) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Hosting already enabled",
        });
      }

      let slug = `${namespace.slug}-${nanoid(10)}`;
      while ((await ctx.db.hosting.count({ where: { slug } })) > 0) {
        slug = `${namespace.slug}-${nanoid(10)}`;
      }

      return ctx.db.hosting.create({
        data: {
          // set default values
          namespaceId: namespace.id,
          title: namespace.name,
          slug,
          systemPrompt: DEFAULT_SYSTEM_PROMPT.compile(),
        },
      });
    }),
  update: protectedProcedure
    .input(
      commonInput.extend({
        title: z.string().min(1).optional(),
        slug: slugSchema.optional(),
        logo: uploadedImageSchema.nullish(),
        protected: z.boolean().optional(),
        allowedEmails: z
          .array(z.string().email().trim().toLowerCase())
          .optional(),
        allowedEmailDomains: z
          .array(z.string().trim().toLowerCase())
          .optional(),
        systemPrompt: z.string().optional(),
        examplesQuestions: z.array(z.string()).max(4).optional(),
        exampleSearchQueries: z.array(z.string()).max(4).optional(),
        welcomeMessage: z.string().optional(),
        citationMetadataPath: z.string().optional(),
        searchEnabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const hosting = await getHosting(ctx, input);

      if (!hosting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Hosting not found",
        });
      }

      const newLogo = input.logo
        ? await uploadImage(
            `namespaces/${prefixId(hosting.namespaceId, "ns_")}/hosting/logo_${nanoid(7)}`,
            input.logo,
          )
        : input.logo === null
          ? null
          : undefined;

      try {
        const updatedHosting = await ctx.db.hosting.update({
          where: {
            id: hosting.id,
          },
          data: {
            title: input.title,
            ...(input.slug && { slug: input.slug }),
            ...(newLogo !== undefined && {
              logo: newLogo ? newLogo.url : null,
            }),
            protected: input.protected,
            allowedEmails: input.allowedEmails ?? [],
            allowedEmailDomains: input.allowedEmailDomains ?? [],
            systemPrompt: input.systemPrompt,
            exampleQuestions: input.examplesQuestions,
            exampleSearchQueries: input.exampleSearchQueries,
            welcomeMessage: input.welcomeMessage,
            citationMetadataPath: input.citationMetadataPath,
            searchEnabled: input.searchEnabled,
          },
        });

        // expire cache
        await getCache().expireTag(`hosting:${hosting.id}`);

        // Delete old logo if it exists
        if ((newLogo || newLogo === null) && hosting.logo) {
          waitUntil(
            deleteAsset(hosting.logo.replace(`${env.ASSETS_S3_URL}/`, "")),
          );
        }

        return updatedHosting;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `The slug "${input.slug}" is already in use.`,
          });
        } else {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "An unknown error occurred",
          });
        }
      }
    }),
});
