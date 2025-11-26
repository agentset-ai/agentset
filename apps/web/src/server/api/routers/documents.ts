import { getDocumentsSchema } from "@/schemas/api/document";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { deleteDocument } from "@/services/documents/delete";
import { getPaginationArgs, paginateResults } from "@/services/pagination";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { DocumentStatus } from "@agentset/db";
import { presignChunksDownloadUrl } from "@agentset/storage";

import { getNamespaceByUser } from "../auth";

export const documentsRouter = createTRPCRouter({
  all: protectedProcedure
    .input(
      getDocumentsSchema.extend({
        namespaceId: z.string(),
        ingestJobId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const namespace = await getNamespaceByUser(ctx, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const { where, ...paginationArgs } = getPaginationArgs(
        input,
        {
          orderBy: input.orderBy,
          order: input.order,
        },
        "doc_",
      );

      const documents = await ctx.db.document.findMany({
        where: {
          namespaceId: namespace.id,
          ...(input.ingestJobId && { ingestJobId: input.ingestJobId }),
          ...(input.statuses &&
            input.statuses.length > 0 && { status: { in: input.statuses } }),
          ...where,
        },
        select: {
          id: true,
          name: true,
          totalTokens: true,
          totalChunks: true,
          totalCharacters: true,
          source: true,
          totalPages: true,
          documentProperties: true,
          createdAt: true,
          queuedAt: true,
          completedAt: true,
          failedAt: true,
          error: true,
          status: true,
        },
        ...paginationArgs,
      });

      return paginateResults(input, documents);
    }),
  delete: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        namespaceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const namespace = await getNamespaceByUser(ctx, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const document = await ctx.db.document.findUnique({
        where: {
          id: input.documentId,
          namespaceId: namespace.id,
        },
        select: { id: true, status: true },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (
        document.status === DocumentStatus.QUEUED_FOR_DELETE ||
        document.status === DocumentStatus.DELETING
      ) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const updatedDocument = await deleteDocument(input.documentId);

      return updatedDocument;
    }),
  getChunksDownloadUrl: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        namespaceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const namespace = await getNamespaceByUser(ctx, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const document = await ctx.db.document.findUnique({
        where: {
          id: input.documentId,
          namespaceId: namespace.id,
        },
        select: { id: true, status: true },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (document.status !== DocumentStatus.COMPLETED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Chunks are only available for completed documents",
        });
      }

      const url = await presignChunksDownloadUrl(namespace.id, document.id);
      if (!url) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { url };
    }),
});
