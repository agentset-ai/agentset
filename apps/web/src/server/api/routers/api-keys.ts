import { revalidateTag } from "next/cache";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

const keyGenerator = (prefix?: string, length = 16) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let apiKey = `${prefix || ""}`;
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    apiKey += characters[randomIndex];
  }

  return apiKey;
};

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
  createApiKey: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        label: z.string(),
        scope: z.enum(["all"]),
      }),
    )
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

      const apiKey = await ctx.db.organizationApiKey.create({
        data: {
          label: input.label,
          scope: input.scope,
          organizationId: input.orgId,
          key: keyGenerator("agentset_"),
        },
      });

      revalidateTag(`apiKey:${apiKey.key}`);

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

      revalidateTag(`apiKey:${apiKey.key}`);

      return { success: true };
    }),
});
