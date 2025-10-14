import type { ProtectedProcedureContext } from "@/server/api/trpc";
import { updateHostingSchema } from "@/schemas/api/hosting";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { deleteHosting } from "@/services/hosting/delete";
import { enableHosting } from "@/services/hosting/enable";
import { getHosting } from "@/services/hosting/get";
import { updateHosting } from "@/services/hosting/update";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

const commonInput = z.object({ namespaceId: z.string() });

const verifyNamespaceAccess = async (
  ctx: ProtectedProcedureContext,
  namespaceId: string,
) => {
  const namespace = await ctx.db.namespace.findFirst({
    where: {
      id: namespaceId,
      organization: {
        members: { some: { userId: ctx.session.user.id } },
      },
    },
  });

  if (!namespace) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Namespace not found or you don't have access to it",
    });
  }

  return namespace;
};

// TODO: only allow for pro users
export const hostingRouter = createTRPCRouter({
  get: protectedProcedure.input(commonInput).query(async ({ ctx, input }) => {
    await verifyNamespaceAccess(ctx, input.namespaceId);
    return getHosting({ namespaceId: input.namespaceId });
  }),
  enable: protectedProcedure
    .input(commonInput)
    .mutation(async ({ ctx, input }) => {
      await verifyNamespaceAccess(ctx, input.namespaceId);

      return enableHosting({
        namespaceId: input.namespaceId,
      });
    }),
  update: protectedProcedure
    .input(commonInput.extend(updateHostingSchema.shape))
    .mutation(async ({ ctx, input: { namespaceId, ...input } }) => {
      await verifyNamespaceAccess(ctx, namespaceId);

      return updateHosting({
        namespaceId,
        input,
      });
    }),
  delete: protectedProcedure
    .input(commonInput)
    .mutation(async ({ ctx, input }) => {
      await verifyNamespaceAccess(ctx, input.namespaceId);

      await deleteHosting({ namespaceId: input.namespaceId });

      return { success: true };
    }),
});
