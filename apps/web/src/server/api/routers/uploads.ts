import { batchUploadSchema, uploadFileSchema } from "@/schemas/api/upload";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createBatchUpload, createUpload } from "@/services/uploads";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { getNamespaceByUser } from "../auth";

export const uploadsRouter = createTRPCRouter({
  getPresignedUrl: protectedProcedure
    .input(
      uploadFileSchema.extend({
        namespaceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ns = await getNamespaceByUser(ctx, { id: input.namespaceId });

      if (!ns) {
        throw new TRPCError({
          code: "NOT_FOUND",
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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
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
    .mutation(async ({ ctx, input }) => {
      const ns = await getNamespaceByUser(ctx, { id: input.namespaceId });

      if (!ns) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Namespace not found",
        });
      }

      const result = await createBatchUpload({
        namespaceId: ns.id,
        files: input.files,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error,
        });
      }

      return result.data;
    }),
});
