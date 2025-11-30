/**
 * Uploads Router
 *
 * Handles file upload operations.
 */

import { batchUploadSchema, uploadFileSchema } from "@/schemas/api/upload";
import { protectedProcedure } from "@/server/orpc/orpc";
import { toProtectedAgentsetContext } from "@/services/shared/adapters";
import { getPresignedUrl } from "@/services/uploads/getPresignedUrl";
import { getPresignedUrls } from "@/services/uploads/getPresignedUrls";
import { z } from "zod/v4";

export const uploadsRouter = {
  getPresignedUrl: protectedProcedure
    .input(
      uploadFileSchema.extend({
        namespaceId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getPresignedUrl(serviceContext, {
        namespaceId: input.namespaceId,
        file: {
          fileName: input.fileName,
          contentType: input.contentType,
          fileSize: input.fileSize,
        },
      });
    }),
  getPresignedUrls: protectedProcedure
    .input(
      batchUploadSchema.extend({
        namespaceId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getPresignedUrls(serviceContext, input);
    }),
};
