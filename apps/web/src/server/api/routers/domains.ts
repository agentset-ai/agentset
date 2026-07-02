import type { ProtectedProcedureContext } from "@/server/api/trpc";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { addDomain } from "@/services/domains/add";
import { checkDomainStatus } from "@/services/domains/check-status";
import { removeDomain } from "@/services/domains/remove";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

const commonInput = z.object({
  namespaceId: z.string(),
});

export type { DomainVerificationStatusProps } from "@/schemas/api/hosting";

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
  });

  return hosting ?? null;
};

const getHostingOrThrow = async (
  ctx: ProtectedProcedureContext,
  input: z.infer<typeof commonInput>,
) => {
  const hosting = await getHosting(ctx, input);
  if (!hosting) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Hosting not found",
    });
  }

  return hosting;
};

export const domainsRouter = createTRPCRouter({
  add: protectedProcedure
    .input(commonInput.extend({ domain: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const hosting = await getHostingOrThrow(ctx, input);
      return addDomain({ hostingId: hosting.id, domain: input.domain });
    }),
  checkStatus: protectedProcedure
    .input(commonInput)
    .query(async ({ ctx, input }) => {
      const hosting = await getHostingOrThrow(ctx, input);
      return checkDomainStatus({ hostingId: hosting.id });
    }),
  remove: protectedProcedure
    .input(commonInput)
    .mutation(async ({ ctx, input }) => {
      const hosting = await getHostingOrThrow(ctx, input);
      return removeDomain({ hostingId: hosting.id });
    }),
});
