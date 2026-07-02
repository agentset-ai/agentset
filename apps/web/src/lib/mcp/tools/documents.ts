import { resolveNamespace, runTool } from "@/lib/mcp/run-tool";
import { namespaceIdSchema } from "@/lib/mcp/schemas";
import { DocumentSchema } from "@/schemas/api/document";
import { paginationSchema } from "@/schemas/api/pagination";
import { queueDocumentDeletion } from "@/services/documents/delete";
import {
  getDocumentChunksDownloadUrl,
  getDocumentFileDownloadUrl,
} from "@/services/documents/download";
import { getDocumentOrThrow } from "@/services/documents/get";
import { getPaginationArgs, paginateResults } from "@/services/pagination";
import { z } from "zod/v4";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Document } from "@agentset/db";
import { DocumentStatusSchema } from "@agentset/db";
import { db } from "@agentset/db/client";
import { normalizeId, prefixId } from "@agentset/utils";

const documentIdSchema = z
  .string()
  .describe("The ID of the document (e.g. `doc_xxx`).");

const toDocumentResponse = (doc: Document) =>
  DocumentSchema.parse({
    ...doc,
    id: prefixId(doc.id, "doc_"),
    ingestJobId: prefixId(doc.ingestJobId, "job_"),
  });

export const registerDocumentTools = (server: McpServer) => {
  server.registerTool(
    "list_documents",
    {
      title: "List documents",
      description:
        "List the documents of a namespace with cursor pagination. Pass the returned `pagination.nextCursor` as `cursor` to fetch the next page. Optionally filter by statuses or by the ingest job that created them.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        statuses: z
          .array(DocumentStatusSchema)
          .optional()
          .describe("Statuses to filter by."),
        orderBy: z.enum(["createdAt"]).optional().default("createdAt"),
        order: z.enum(["asc", "desc"]).optional().default("desc"),
        ingestJobId: z
          .string()
          .optional()
          .describe("The ingest job ID to filter documents by."),
        ...paginationSchema.shape,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);

        const { where, ...paginationArgs } = getPaginationArgs(
          args,
          {
            orderBy: args.orderBy,
            order: args.order,
          },
          "doc_",
        );

        const documents = await db.document.findMany({
          where: {
            tenantId: ctx.tenantId,
            namespaceId: namespace.id,
            ...(args.ingestJobId && {
              ingestJobId: normalizeId(args.ingestJobId, "job_"),
            }),
            ...(args.statuses &&
              args.statuses.length > 0 && { status: { in: args.statuses } }),
            ...where,
          },
          ...paginationArgs,
        });

        const paginated = paginateResults(
          args,
          documents.map(toDocumentResponse),
        );

        return {
          records: paginated.records,
          pagination: paginated.pagination,
        };
      }),
  );

  server.registerTool(
    "get_document",
    {
      title: "Get document",
      description:
        "Get a document by ID, including its status, source, and chunk/token/page counts.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        documentId: documentIdSchema,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);

        const doc = await getDocumentOrThrow({
          namespaceId: namespace.id,
          documentId: args.documentId,
          tenantId: ctx.tenantId,
        });

        return toDocumentResponse(doc);
      }),
  );

  server.registerTool(
    "delete_document",
    {
      title: "Delete document",
      description:
        "Delete a single document and its vectors. Deletion is asynchronous — the document status transitions to QUEUED_FOR_DELETE.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        documentId: documentIdSchema,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);

        const data = await queueDocumentDeletion({
          namespaceId: namespace.id,
          organizationId: namespace.organizationId,
          documentId: args.documentId,
          tenantId: ctx.tenantId,
        });

        return toDocumentResponse(data);
      }),
  );

  server.registerTool(
    "get_document_chunks_download_url",
    {
      title: "Get document chunks download URL",
      description:
        "Get a presigned URL to download the parsed chunks of a document as JSON. Only available once the document status is COMPLETED. The URL is temporary — download it promptly.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        documentId: documentIdSchema,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);

        return getDocumentChunksDownloadUrl({
          namespaceId: namespace.id,
          documentId: args.documentId,
          tenantId: ctx.tenantId,
        });
      }),
  );

  server.registerTool(
    "get_document_file_download_url",
    {
      title: "Get document file download URL",
      description:
        "Get a presigned URL to download the original file of a document. Only available for documents ingested as managed files (uploaded via create_upload_urls). The URL is temporary — download it promptly.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        documentId: documentIdSchema,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);

        return getDocumentFileDownloadUrl({
          namespaceId: namespace.id,
          documentId: args.documentId,
          tenantId: ctx.tenantId,
        });
      }),
  );
};
