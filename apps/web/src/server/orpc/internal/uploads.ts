import { batchUploadSchema, uploadFileSchema } from "@/schemas/api/upload";
import { protectedProcedure } from "@/server/orpc/base";
import { createBatchUpload, createUpload } from "@/services/uploads";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { db } from "@agentset/db/client";

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

      const organization = await db.organization.findUnique({
        where: { id: ns.organizationId },
        select: { plan: true },
      });

      if (!organization) {
        throw new ORPCError("NOT_FOUND", {
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
        throw new ORPCError(
          result.code === "file_too_large"
            ? "FORBIDDEN"
            : "INTERNAL_SERVER_ERROR",
          {
            message: result.error,
          },
        );
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

      const organization = await db.organization.findUnique({
        where: { id: ns.organizationId },
        select: { plan: true },
      });

      if (!organization) {
        throw new ORPCError("NOT_FOUND", {
          message: "Organization not found",
        });
      }

      const result = await createBatchUpload({
        namespaceId: ns.id,
        plan: organization.plan,
        files: input.files,
      });

      if (!result.success) {
        throw new ORPCError(
          result.code === "file_too_large"
            ? "FORBIDDEN"
            : "INTERNAL_SERVER_ERROR",
          {
            message: result.error,
          },
        );
      }

      return result.data;
    }),
};
