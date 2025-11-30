/**
 * Public API Uploads Router
 *
 * Handles file upload operations for public API routes.
 */

import { AgentsetApiError } from "@/lib/api/errors";
import { normalizeId } from "@/lib/api/ids";
import { apiSuccessSchema } from "@/schemas/api/response";
import {
  batchUploadSchema,
  uploadFileSchema,
  UploadResultSchema,
} from "@/schemas/api/upload";
import { createPublicContext } from "@/services/shared/create-public-context";
import { getNamespace as getNamespaceAccess } from "@/services/shared/namespace-access";
import { createBatchUpload, createUpload } from "@/services/uploads";
import { z } from "zod/v4";

import { publicApiProcedure } from "../orpc";

export const uploadsRouter = {
  /**
   * Create a single upload
   */
  create: publicApiProcedure
    .route({
      method: "POST",
      path: "/namespace/{namespaceId}/uploads",
      successStatus: 201,
    })
    .input(
      z
        .object({
          namespaceId: z.string(),
        })
        .extend(uploadFileSchema.shape),
    )
    .output(apiSuccessSchema(UploadResultSchema))
    .handler(async ({ context, input }) => {
      const { namespaceId: rawNamespaceId, ...fileData } = input;
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

      const result = await createUpload({
        namespaceId: namespace.id,
        file: fileData,
      });

      if (!result.success) {
        throw new AgentsetApiError({
          code: "internal_server_error",
          message: result.error,
        });
      }

      const data = UploadResultSchema.parse(result.data);
      return { success: true, data };
    }),

  /**
   * Create batch uploads
   */
  createBatch: publicApiProcedure
    .route({
      method: "POST",
      path: "/namespace/{namespaceId}/uploads/batch",
      successStatus: 201,
    })
    .input(
      z
        .object({
          namespaceId: z.string(),
        })
        .extend(batchUploadSchema.shape),
    )
    .output(apiSuccessSchema(z.array(UploadResultSchema)))
    .handler(async ({ context, input }) => {
      const { namespaceId: rawNamespaceId, files } = input;
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

      const result = await createBatchUpload({
        namespaceId: namespace.id,
        files,
      });

      if (!result.success) {
        throw new AgentsetApiError({
          code: "internal_server_error",
          message: result.error,
        });
      }

      const data = z.array(UploadResultSchema).parse(result.data);
      return { success: true, data };
    }),
};
