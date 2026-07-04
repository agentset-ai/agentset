import type { ProtectedContext } from "@/server/orpc/base";
import { updateHostingSchema } from "@/schemas/api/hosting";
import { protectedProcedure } from "@/server/orpc/base";
import { deleteHosting } from "@/services/hosting/delete";
import { enableHosting } from "@/services/hosting/enable";
import { getHosting } from "@/services/hosting/get";
import { updateHosting } from "@/services/hosting/update";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { db } from "@agentset/db/client";

const commonInput = z.object({ namespaceId: z.string() });

const verifyNamespaceAccess = async (
  context: Pick<ProtectedContext, "session">,
  namespaceId: string,
) => {
  const namespace = await db.namespace.findFirst({
    where: {
      id: namespaceId,
      organization: {
        members: { some: { userId: context.session.user.id } },
      },
    },
  });

  if (!namespace) {
    throw new ORPCError("NOT_FOUND", {
      message: "Namespace not found or you don't have access to it",
    });
  }

  return namespace;
};

// TODO: only allow for pro users
export const hostingRouter = {
  get: protectedProcedure
    .input(commonInput)
    .handler(async ({ context, input }) => {
      await verifyNamespaceAccess(context, input.namespaceId);
      return getHosting({ namespaceId: input.namespaceId });
    }),
  enable: protectedProcedure
    .input(commonInput)
    .handler(async ({ context, input }) => {
      await verifyNamespaceAccess(context, input.namespaceId);

      return enableHosting({
        namespaceId: input.namespaceId,
      });
    }),
  update: protectedProcedure
    .input(commonInput.extend(updateHostingSchema.shape))
    .handler(async ({ context, input: { namespaceId, ...input } }) => {
      await verifyNamespaceAccess(context, namespaceId);

      return updateHosting({
        namespaceId,
        input,
      });
    }),
  delete: protectedProcedure
    .input(commonInput)
    .handler(async ({ context, input }) => {
      await verifyNamespaceAccess(context, input.namespaceId);

      await deleteHosting({ namespaceId: input.namespaceId });

      return { success: true };
    }),
};
