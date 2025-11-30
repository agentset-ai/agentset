/**
 * Public API Hosting Router
 *
 * Handles hosting operations for public API routes.
 */

import { AgentsetApiError } from "@/lib/api/errors";
import { normalizeId, prefixId } from "@/lib/api/ids";
import { HostingSchema, updateHostingSchema } from "@/schemas/api/hosting";
import { apiSuccessSchema } from "@/schemas/api/response";
import { deleteHosting } from "@/services/hosting/delete";
import { enableHosting } from "@/services/hosting/enable";
import { getHosting } from "@/services/hosting/get";
import { updateHosting } from "@/services/hosting/update";
import { createPublicContext } from "@/services/shared/create-public-context";
import { getNamespace as getNamespaceAccess } from "@/services/shared/namespace-access";
import { z } from "zod/v4";

import { publicApiProcedure } from "../orpc";

export const hostingRouter = {
  /**
   * Get hosting configuration
   */
  get: publicApiProcedure
    .route({ method: "GET", path: "/namespace/{namespaceId}/hosting" })
    .input(
      z.object({
        namespaceId: z.string(),
      }),
    )
    .output(apiSuccessSchema(HostingSchema))
    .handler(async ({ context, input }) => {
      const namespaceId = normalizeId(input.namespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const hosting = await getHosting(serviceContext, {
        namespaceId: namespace.id,
      });

      if (!hosting) {
        throw new AgentsetApiError({
          code: "not_found",
          message: "Hosting not found for this namespace.",
        });
      }

      const data = HostingSchema.parse({
        ...hosting,
        namespaceId: prefixId(hosting.namespaceId, "ns_"),
      });
      return { success: true, data };
    }),

  /**
   * Enable hosting
   */
  enable: publicApiProcedure
    .route({
      method: "POST",
      path: "/namespace/{namespaceId}/hosting",
      successStatus: 201,
    })
    .input(
      z.object({
        namespaceId: z.string(),
      }),
    )
    .output(apiSuccessSchema(HostingSchema))
    .handler(async ({ context, input }) => {
      const namespaceId = normalizeId(input.namespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const hosting = await enableHosting(serviceContext, {
        namespaceId: namespace.id,
      });

      const data = HostingSchema.parse({
        ...hosting,
        namespaceId: prefixId(hosting.namespaceId, "ns_"),
      });
      return { success: true, data };
    }),

  /**
   * Update hosting configuration
   */
  update: publicApiProcedure
    .route({ method: "PATCH", path: "/namespace/{namespaceId}/hosting" })
    .input(
      z
        .object({
          namespaceId: z.string(),
        })
        .extend(updateHostingSchema.shape),
    )
    .output(apiSuccessSchema(HostingSchema))
    .handler(async ({ context, input }) => {
      const { namespaceId: rawNamespaceId, ...updateData } = input;
      const namespaceId = normalizeId(rawNamespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const updatedHosting = await updateHosting(serviceContext, {
        namespaceId: namespace.id,
        data: updateData,
      });

      const data = HostingSchema.parse({
        ...updatedHosting,
        namespaceId: prefixId(updatedHosting.namespaceId, "ns_"),
      });
      return { success: true, data };
    }),

  /**
   * Delete hosting
   */
  delete: publicApiProcedure
    .route({ method: "DELETE", path: "/namespace/{namespaceId}/hosting" })
    .input(
      z.object({
        namespaceId: z.string(),
      }),
    )
    .output(apiSuccessSchema(HostingSchema))
    .handler(async ({ context, input }) => {
      const namespaceId = normalizeId(input.namespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const hosting = await getHosting(serviceContext, {
        namespaceId: namespace.id,
      });

      if (!hosting) {
        throw new AgentsetApiError({
          code: "not_found",
          message: "Hosting not found for this namespace.",
        });
      }

      await deleteHosting(serviceContext, {
        namespaceId: namespace.id,
      });

      const data = HostingSchema.parse({
        ...hosting,
        namespaceId: prefixId(hosting.namespaceId, "ns_"),
      });
      return { success: true, data };
    }),
};
