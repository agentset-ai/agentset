/**
 * Organizations Router
 *
 * Handles organization management operations.
 */

import { protectedProcedure } from "@/server/orpc/orpc";
import { deleteOrganization } from "@/services/organizations/delete";
import { getAllOrganizations } from "@/services/organizations/getAll";
import { getOrganizationBySlug } from "@/services/organizations/getBySlug";
import { getOrganizationMembers } from "@/services/organizations/getMembers";
import { toProtectedAgentsetContext } from "@/services/shared/adapters";
import { z } from "zod/v4";

export const organizationsRouter = {
  all: protectedProcedure.handler(async ({ context }) => {
    const serviceContext = toProtectedAgentsetContext(context);
    return await getAllOrganizations(serviceContext);
  }),
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getOrganizationBySlug(serviceContext, input);
    }),
  members: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getOrganizationMembers(serviceContext, input);
    }),
  delete: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await deleteOrganization(serviceContext, input);
    }),
};
