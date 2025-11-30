/**
 * Hosting Router
 *
 * Handles hosting configuration operations.
 */

import { updateHostingSchema } from "@/schemas/api/hosting";
import { protectedProcedure } from "@/server/orpc/orpc";
import { deleteHosting } from "@/services/hosting/delete";
import { enableHosting } from "@/services/hosting/enable";
import { getHosting } from "@/services/hosting/get";
import { updateHosting } from "@/services/hosting/update";
import { toProtectedAgentsetContext } from "@/services/shared/adapters";
import { z } from "zod/v4";

const commonInput = z.object({ namespaceId: z.string() });

export const hostingRouter = {
  get: protectedProcedure
    .input(commonInput)
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getHosting(serviceContext, input);
    }),
  enable: protectedProcedure
    .input(commonInput)
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await enableHosting(serviceContext, input);
    }),
  update: protectedProcedure
    .input(commonInput.extend(updateHostingSchema.shape))
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      const { namespaceId, ...data } = input;
      return await updateHosting(serviceContext, {
        namespaceId,
        data,
      });
    }),
  delete: protectedProcedure
    .input(commonInput)
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await deleteHosting(serviceContext, input);
    }),
};
