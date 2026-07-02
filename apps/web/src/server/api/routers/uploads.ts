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

      const organization = await ctx.db.organization.findUnique({
        where: { id: ns.organizationId },
        select: { plan: true },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      const result = await createUpload({
        namespaceId: ns.id,
        plan: organization.plan,
        file: {
          fileName: input.fileName,
          contentType: input.contentType,
          fileSize: input.fileSize,
        },
      });

      if (!result.success) {
        throw new TRPCError({
          code:
            result.code === "file_too_large"
              ? "FORBIDDEN"
              : "INTERNAL_SERVER_ERROR",
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

      const organization = await ctx.db.organization.findUnique({
        where: { id: ns.organizationId },
        select: { plan: true },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      const result = await createBatchUpload({
        namespaceId: ns.id,
        plan: organization.plan,
        files: input.files,
      });

      if (!result.success) {
        throw new TRPCError({
          code:
            result.code === "file_too_large"
              ? "FORBIDDEN"
              : "INTERNAL_SERVER_ERROR",
          message: result.error,
        });
      }

      return result.data;
    }),
});
