import { extname } from "node:path";
import { filenamize } from "@/lib/string-utils";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { presignUploadUrl } from "@agentset/storage";
import { MAX_UPLOAD_SIZE } from "@agentset/storage/constants";
import { tryCatch } from "@agentset/utils";

import { getNamespaceByUser } from "../auth";

const supportedExtensions = [
  ".bmp",
  ".csv",
  ".doc",
  ".docx",
  ".eml",
  ".epub",
  ".heic",
  ".html",
  ".jpeg",
  ".png",
  ".md",
  ".msg",
  ".odt",
  ".org",
  ".p7s",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".rst",
  ".rtf",
  ".tiff",
  ".txt",
  ".tsv",
  ".xls",
  ".xlsx",
  ".xml",
];

export const uploadsRouter = createTRPCRouter({
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        namespaceId: z.string(),
        fileName: z.string(),
        contentType: z.string(),
        fileSize: z.number().min(1).max(MAX_UPLOAD_SIZE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ext = extname(input.fileName);
      const filename = filenamize(input.fileName.replace(ext, ""));

      if (!supportedExtensions.includes(ext)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unsupported file type",
        });
      }

      const ns = await getNamespaceByUser(ctx, { id: input.namespaceId });

      if (!ns) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Namespace not found",
        });
      }

      const key = `namespaces/${ns.id}/${filename}${ext}`;
      const url = await tryCatch(
        presignUploadUrl({
          key,
          contentType: input.contentType,
          fileSize: input.fileSize,
        }),
      );

      if (url.error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      return {
        url: url.data,
        key,
      };
    }),
  getPresignedUrls: protectedProcedure
    .input(
      z.object({
        namespaceId: z.string(),
        files: z
          .array(
            z.object({
              fileName: z.string(),
              contentType: z.string(),
              fileSize: z.number().min(1).max(MAX_UPLOAD_SIZE),
            }),
          )
          .min(1, { message: "At least one file is required" })
          .max(100, { message: "Maximum 100 files" }),
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

      const preparedFiles = input.files.map((file) => {
        const ext = extname(file.fileName);
        const filename = filenamize(file.fileName.replace(ext, ""));

        return {
          ext,
          contentType: file.contentType,
          fileSize: file.fileSize,
          key: `namespaces/${ns.id}/${filename}${ext}`,
        };
      });

      if (
        preparedFiles.some((file) => !supportedExtensions.includes(file.ext))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unsupported file type",
        });
      }

      const urls = await Promise.all(
        preparedFiles.map(async (file) => {
          const url = await tryCatch(
            presignUploadUrl({
              key: file.key,
              contentType: file.contentType,
              fileSize: file.fileSize,
            }),
          );

          return {
            url,
            key: file.key,
          };
        }),
      );

      if (urls.some((url) => url.url.error)) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      return urls.map((url) => ({
        url: url.url.data!,
        key: url.key,
      }));
    }),
});
