import { revalidateTag } from "next/cache";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createApiKey, createApiKeySchema } from "@/services/api-key/create";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

export const apiKeysRouter = createTRPCRouter({
  getApiKeys: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // make sure the user is a member of the org
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.orgId,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const apiKeys = await ctx.db.organizationApiKey.findMany({
        where: {
          organizationId: input.orgId,
        },
        omit: {
          key: true,
        },
      });

      return apiKeys;
    }),
  getDefaultApiKey: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.orgId,
        },
        select: { id: true },
      });

      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const apiKey = await ctx.db.organizationApiKey.findFirst({
        where: {
          organizationId: input.orgId,
          label: "Default API Key",
        },
        select: { key: true },
      });

      return apiKey?.key ?? null;
    }),
  createApiKey: protectedProcedure
    .input(createApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const apiKey = await createApiKey(input);

      return apiKey;
    }),
  deleteApiKey: protectedProcedure
    .input(z.object({ orgId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.orgId,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const apiKey = await ctx.db.organizationApiKey.delete({
        where: {
          id: input.id,
        },
      });

      revalidateTag(`apiKey:${apiKey.key}`, "max");

      return { success: true };
    }),
});
