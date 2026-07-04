import { getDocumentsSchema } from "@/schemas/api/document";
import { protectedProcedure } from "@/server/orpc/base";
import { deleteDocument } from "@/services/documents/delete";
import { getPaginationArgs, paginateResults } from "@/services/pagination";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { DocumentStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { presignChunksDownloadUrl, presignGetUrl } from "@agentset/storage";

import { getNamespaceByUser } from "./helpers";

export const documentsRouter = {
  all: protectedProcedure
    .input(
      getDocumentsSchema.extend({
        namespaceId: z.string(),
        ingestJobId: z.string().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const namespace = await getNamespaceByUser(context, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new ORPCError("NOT_FOUND");
      }

      const { where, ...paginationArgs } = getPaginationArgs(
        input,
        {
          orderBy: input.orderBy,
          order: input.order,
        },
        "doc_",
      );

      const documents = await db.document.findMany({
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
    .handler(async ({ context, input }) => {
      const namespace = await getNamespaceByUser(context, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new ORPCError("NOT_FOUND");
      }

      const document = await db.document.findUnique({
        where: {
          id: input.documentId,
          namespaceId: namespace.id,
        },
        select: { id: true, status: true },
      });

      if (!document) {
        throw new ORPCError("NOT_FOUND");
      }

      if (
        document.status === DocumentStatus.QUEUED_FOR_DELETE ||
        document.status === DocumentStatus.DELETING
      ) {
        throw new ORPCError("BAD_REQUEST");
      }

      const updatedDocument = await deleteDocument({
        documentId: input.documentId,
        organizationId: namespace.organizationId,
      });

      return updatedDocument;
    }),
  getChunksDownloadUrl: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        namespaceId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const namespace = await getNamespaceByUser(context, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new ORPCError("NOT_FOUND");
      }

      const document = await db.document.findUnique({
        where: {
          id: input.documentId,
          namespaceId: namespace.id,
        },
        select: { id: true, status: true },
      });

      if (!document) {
        throw new ORPCError("NOT_FOUND");
      }

      if (document.status !== DocumentStatus.COMPLETED) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Chunks are only available for completed documents",
        });
      }

      const url = await presignChunksDownloadUrl(namespace.id, document.id);
      if (!url) {
        throw new ORPCError("NOT_FOUND");
      }

      return { url };
    }),
  getFileDownloadUrl: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        namespaceId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const namespace = await getNamespaceByUser(context, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new ORPCError("NOT_FOUND");
      }

      const document = await db.document.findUnique({
        where: {
          id: input.documentId,
          namespaceId: namespace.id,
        },
        select: { id: true, name: true, source: true },
      });

      if (!document) {
        throw new ORPCError("NOT_FOUND");
      }

      if (document.source.type !== "MANAGED_FILE") {
        throw new ORPCError("BAD_REQUEST", {
          message: "File download is only available for managed files",
        });
      }

      const { url } = await presignGetUrl(document.source.key, {
        fileName: document.name ?? undefined,
      });

      return { url };
    }),
};
