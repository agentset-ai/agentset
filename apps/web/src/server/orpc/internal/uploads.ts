import { batchUploadSchema, uploadFileSchema } from "@/schemas/api/upload";
import { protectedProcedure } from "@/server/orpc/base";
import { createBatchUpload, createUpload } from "@/services/uploads";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { getNamespaceByUser } from "./helpers";

export const uploadsRouter = {
  getPresignedUrl: protectedProcedure
    .input(
      uploadFileSchema.extend({
        namespaceId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const ns = await getNamespaceByUser(context, { id: input.namespaceId });

      if (!ns) {
        throw new ORPCError("NOT_FOUND", {
          message: "Namespace not found",
        });
      }

      const result = await createUpload({
        namespaceId: ns.id,
        file: {
          fileName: input.fileName,
          contentType: input.contentType,
          fileSize: input.fileSize,
        },
      });

      if (!result.success) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: result.error,
        });
      }

      return result.data;
    }),
  getPresignedUrls: protectedProcedure
    .input(
      batchUploadSchema.extend({
        namespaceId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const ns = await getNamespaceByUser(context, { id: input.namespaceId });

      if (!ns) {
        throw new ORPCError("NOT_FOUND", {
          message: "Namespace not found",
        });
      }

      const result = await createBatchUpload({
        namespaceId: ns.id,
        files: input.files,
      });

      if (!result.success) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: result.error,
        });
      }

      return result.data;
    }),
};
