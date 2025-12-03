/**
 * Domains Router
 *
 * Handles custom domain management operations.
 */

import { protectedProcedure } from "@/server/orpc/orpc";
import { addDomain } from "@/services/domains/add";
import { checkDomainStatus } from "@/services/domains/checkStatus";
import { removeDomain } from "@/services/domains/remove";
import { toProtectedAgentsetContext } from "@/services/shared/adapters";
import { z } from "zod/v4";

const commonInput = z.object({
  namespaceId: z.string(),
});

export const domainsRouter = {
  add: protectedProcedure
    .input(commonInput.extend({ domain: z.string() }))
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await addDomain(serviceContext, input);
    }),
  checkStatus: protectedProcedure
    .input(commonInput)
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await checkDomainStatus(serviceContext, input);
    }),
  remove: protectedProcedure
    .input(commonInput)
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await removeDomain(serviceContext, input);
    }),
};
