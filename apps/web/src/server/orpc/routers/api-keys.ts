/**
 * API Keys Router
 *
 * Handles API key management operations.
 */

import { protectedProcedure } from "@/server/orpc/orpc";
import { createApiKey } from "@/services/api-keys/create";
import { deleteApiKey } from "@/services/api-keys/delete";
import { getAllApiKeys } from "@/services/api-keys/getAll";
import { toProtectedAgentsetContext } from "@/services/shared/adapters";
import { z } from "zod/v4";

export const apiKeysRouter = {
  getApiKeys: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getAllApiKeys(serviceContext, input);
    }),
  createApiKey: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        label: z.string(),
        scope: z.enum(["all"]),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await createApiKey(serviceContext, input);
    }),
  deleteApiKey: protectedProcedure
    .input(z.object({ orgId: z.string(), id: z.string() }))
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await deleteApiKey(serviceContext, input);
    }),
};
