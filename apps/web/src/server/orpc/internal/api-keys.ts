import { protectedProcedure } from "@/server/orpc/base";
import { createApiKey, createApiKeySchema } from "@/services/api-key/create";
import { deleteApiKey } from "@/services/api-key/delete";
import { listApiKeys } from "@/services/api-key/list";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";

export const apiKeysRouter = {
  getApiKeys: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      // make sure the user is a member of the org
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.orgId,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const apiKeys = await listApiKeys({ organizationId: input.orgId });

      return apiKeys;
    }),
  getDefaultApiKey: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .handler(async ({ context, input }) => {
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.orgId,
        },
        select: { id: true },
      });

      if (!member) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const apiKey = await db.organizationApiKey.findFirst({
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
    .handler(async ({ context, input }) => {
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const apiKey = await createApiKey(input);

      return apiKey;
    }),
  deleteApiKey: protectedProcedure
    .input(z.object({ orgId: z.string(), id: z.string() }))
    .handler(async ({ context, input }) => {
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.orgId,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new ORPCError("UNAUTHORIZED");
      }

      try {
        // scoped to the org so a member of one org can't delete another org's key
        await deleteApiKey({ id: input.id, organizationId: input.orgId });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new ORPCError("NOT_FOUND");
        }

        throw error;
      }

      return { success: true };
    }),
};
