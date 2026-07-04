import type { ProtectedContext } from "@/server/orpc/base";
import { protectedProcedure } from "@/server/orpc/base";
import { addDomain } from "@/services/domains/add";
import { checkDomainStatus } from "@/services/domains/check-status";
import { removeDomain } from "@/services/domains/remove";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { db } from "@agentset/db/client";

const commonInput = z.object({
  namespaceId: z.string(),
});

export type { DomainVerificationStatusProps } from "@/schemas/api/hosting";

const getHosting = async (
  ctx: Pick<ProtectedContext, "session">,
  input: z.infer<typeof commonInput>,
) => {
  const hosting = await db.hosting.findFirst({
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
  ctx: Pick<ProtectedContext, "session">,
  input: z.infer<typeof commonInput>,
) => {
  const hosting = await getHosting(ctx, input);
  if (!hosting) {
    throw new ORPCError("NOT_FOUND", {
      message: "Hosting not found",
    });
  }

  return hosting;
};

export const domainsRouter = {
  add: protectedProcedure
    .input(commonInput.extend({ domain: z.string() }))
    .handler(async ({ context, input }) => {
      const hosting = await getHostingOrThrow(context, input);
      return addDomain({ hostingId: hosting.id, domain: input.domain });
    }),
  checkStatus: protectedProcedure
    .input(commonInput)
    .handler(async ({ context, input }) => {
      const hosting = await getHostingOrThrow(context, input);
      return checkDomainStatus({ hostingId: hosting.id });
    }),
  remove: protectedProcedure
    .input(commonInput)
    .handler(async ({ context, input }) => {
      const hosting = await getHostingOrThrow(context, input);
      return removeDomain({ hostingId: hosting.id });
    }),
};
