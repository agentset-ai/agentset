/**
 * Namespaces Router
 *
 * Handles namespace-related operations.
 */

import { createNamespaceSchema } from "@/schemas/api/namespace";
import { protectedProcedure } from "@/server/orpc/orpc";
import { checkSlug } from "@/services/namespaces/checkSlug";
import { createNamespace } from "@/services/namespaces/create";
import { deleteNamespace } from "@/services/namespaces/delete";
import { getNamespaceBySlug } from "@/services/namespaces/getBySlug";
import { getOnboardingStatus } from "@/services/namespaces/getOnboardingStatus";
import { getOrgNamespaces } from "@/services/namespaces/getOrgNamespaces";
import { toProtectedAgentsetContext } from "@/services/shared/adapters";
import { z } from "zod/v4";

export const namespaceRouter = {
  getOrgNamespaces: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getOrgNamespaces(serviceContext, input);
    }),
  getNamespaceBySlug: protectedProcedure
    .input(z.object({ orgSlug: z.string(), slug: z.string() }))
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getNamespaceBySlug(serviceContext, input);
    }),
  getOnboardingStatus: protectedProcedure
    .input(z.object({ orgSlug: z.string(), slug: z.string() }))
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getOnboardingStatus(serviceContext, input);
    }),
  checkSlug: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        slug: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await checkSlug(serviceContext, input);
    }),
  createNamespace: protectedProcedure
    .input(
      createNamespaceSchema.merge(
        z.object({
          orgId: z.string(),
        }),
      ),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await createNamespace(serviceContext, {
        name: input.name,
        slug: input.slug,
        orgId: input.orgId,
        embeddingConfig: input.embeddingConfig,
        vectorStoreConfig: input.vectorStoreConfig,
      });
    }),
  deleteNamespace: protectedProcedure
    .input(
      z.object({
        namespaceId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await deleteNamespace(serviceContext, input);
    }),
};
