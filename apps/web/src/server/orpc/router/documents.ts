import {
  documentIdPathSchema,
  namespaceIdPathSchema,
} from "@/schemas/api/params";
import { DocumentSchema, getDocumentsSchema } from "@/schemas/api/document";
import {
  api,
  protectedProcedure,
  requireNamespace,
  successSchema,
} from "@/server/orpc/base";
import { queueDocumentDeletion } from "@/services/documents/delete";
import {
  getDocumentChunksDownloadUrl,
  getDocumentFileDownloadUrl,
} from "@/services/documents/download";
import { getDocumentOrThrow } from "@/services/documents/get";
import { getPaginationArgs, paginateResults } from "@/services/pagination";
import { ORPCError, type } from "@orpc/server";
import { z } from "zod/v4";

import { db } from "@agentset/db/client";
import { normalizeId, prefixId } from "@agentset/utils";

import { makeCodeSamples, ts } from "./code-samples";
import { getNamespaceByUser } from "./helpers";

const list = api
  .route({
    method: "GET",
    path: "/namespace/{namespaceId}/documents",
    operationId: "listDocuments",
    summary: "Retrieve a list of documents",
    description:
      "Retrieve a paginated list of documents for the authenticated organization.",
    tags: ["Documents"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "list",
      "x-speakeasy-pagination": {
        type: "cursor",
        inputs: [
          {
            name: "cursor",
            in: "parameters",
            type: "cursor",
          },
        ],
        outputs: {
          nextCursor: "$.pagination.nextCursor",
        },
      },
      security: [{ token: [] }],
      ...makeCodeSamples(ts`
const docs = await ns.documents.all();
console.log(docs);
`),
    }),
  })
  .input(getDocumentsSchema.extend({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(z.array(DocumentSchema), { hasPagination: true }))
  .handler(async ({ context, input }) => {
    // For backward pagination we scan in the opposite direction, then reverse results.
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
        tenantId: context.tenantId,
        namespaceId: context.namespace.id,
        ...(input.ingestJobId && {
          ingestJobId: normalizeId(input.ingestJobId, "job_"),
        }),
        ...(input.statuses &&
          input.statuses.length > 0 && { status: { in: input.statuses } }),
        ...where,
      },
      ...paginationArgs,
    });

    const paginated = paginateResults(
      input,
      documents.map((doc) => ({
        ...doc,
        ingestJobId: prefixId(doc.ingestJobId, "job_"),
        id: prefixId(doc.id, "doc_"),
      })),
    );

    return {
      success: true as const,
      data: paginated.records,
      pagination: paginated.pagination,
    };
  });

const get = api
  .route({
    method: "GET",
    path: "/namespace/{namespaceId}/documents/{documentId}",
    operationId: "getDocument",
    summary: "Retrieve a document",
    description: "Retrieve the info for a document.",
    tags: ["Documents"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "get",
      security: [{ token: [] }],
      ...makeCodeSamples(ts`
const document = await ns.documents.get("doc_123");
console.log(document);
`),
    }),
  })
  .input(
    z.object({
      namespaceId: namespaceIdPathSchema,
      documentId: documentIdPathSchema,
    }),
  )
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(DocumentSchema))
  .handler(async ({ context, input }) => {
    const doc = await getDocumentOrThrow({
      namespaceId: context.namespace.id,
      documentId: input.documentId,
      tenantId: context.tenantId,
    });

    return {
      success: true as const,
      data: {
        ...doc,
        id: prefixId(doc.id, "doc_"),
        ingestJobId: prefixId(doc.ingestJobId, "job_"),
      },
    };
  });

const del = api
  .route({
    method: "DELETE",
    path: "/namespace/{namespaceId}/documents/{documentId}",
    operationId: "deleteDocument",
    summary: "Delete a document",
    description: "Delete a document for the authenticated organization.",
    tags: ["Documents"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "delete",
      "x-speakeasy-max-method-params": 1,
      security: [{ token: [] }],
      ...makeCodeSamples(ts`
await ns.documents.delete("doc_123");
console.log("Document queued for deletion");
`),
    }),
  })
  .input(
    z.object({
      namespaceId: namespaceIdPathSchema,
      documentId: documentIdPathSchema,
    }),
  )
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(DocumentSchema))
  .handler(async ({ context, input }) => {
    // TODO: check apiScope
    const data = await queueDocumentDeletion({
      namespaceId: context.namespace.id,
      organizationId: context.namespace.organizationId,
      documentId: input.documentId,
      tenantId: context.tenantId,
    });

    return {
      success: true as const,
      data: {
        ...data,
        id: prefixId(data.id, "doc_"),
        ingestJobId: prefixId(data.ingestJobId, "job_"),
      },
    };
  });

const getFileDownloadUrl = api
  .route({
    method: "POST",
    path: "/namespace/{namespaceId}/documents/{documentId}/file-download-url",
    operationId: "getFileDownloadUrl",
    summary: "Get file download URL",
    description:
      "Get a presigned download URL for a document's source file. Only available for documents with source type MANAGED_FILE.",
    tags: ["Documents"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "getFileDownloadUrl",
      security: [{ token: [] }],
      responses: {
        ...current.responses,
        "200": {
          description: "The presigned download URL for the file",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", const: true },
                  data: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                    },
                    required: ["url"],
                    additionalProperties: false,
                  },
                },
                required: ["success", "data"],
                additionalProperties: false,
              },
            },
          },
        },
      },
      ...makeCodeSamples(ts`
const { url } = await ns.documents.getFileDownloadUrl("doc_123");
const file = await fetch(url);
fs.writeFileSync("file.pdf", Buffer.from(await file.arrayBuffer()));
`),
    }),
  })
  .input(
    z.object({
      namespaceId: namespaceIdPathSchema,
      documentId: documentIdPathSchema,
    }),
  )
  .use(requireNamespace, (input) => input.namespaceId)
  .output(type<{ success: true; data: { url: string } }>())
  .handler(async ({ context, input }) => {
    const data = await getDocumentFileDownloadUrl({
      namespaceId: context.namespace.id,
      documentId: input.documentId,
      tenantId: context.tenantId,
    });

    return { success: true as const, data };
  });

const getChunksDownloadUrl = api
  .route({
    method: "POST",
    path: "/namespace/{namespaceId}/documents/{documentId}/chunks-download-url",
    operationId: "getChunksDownloadUrl",
    summary: "Get chunks download URL",
    description:
      "Get a presigned download URL for a document's chunks. Only available for completed documents.",
    tags: ["Documents"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "getChunksDownloadUrl",
      security: [{ token: [] }],
      responses: {
        ...current.responses,
        "200": {
          description: "The presigned download URL for the chunks",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", const: true },
                  data: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                    },
                    required: ["url"],
                    additionalProperties: false,
                  },
                },
                required: ["success", "data"],
                additionalProperties: false,
              },
            },
          },
        },
      },
      ...makeCodeSamples(ts`
const { url } = await ns.documents.getChunksDownloadUrl("doc_123");
const data = await (await fetch(url)).json();
console.log(data);
`),
    }),
  })
  .input(
    z.object({
      namespaceId: namespaceIdPathSchema,
      documentId: documentIdPathSchema,
    }),
  )
  .use(requireNamespace, (input) => input.namespaceId)
  .output(type<{ success: true; data: { url: string } }>())
  .handler(async ({ context, input }) => {
    const data = await getDocumentChunksDownloadUrl({
      namespaceId: context.namespace.id,
      documentId: input.documentId,
      tenantId: context.tenantId,
    });

    return { success: true as const, data };
  });

/**
 * Dashboard-only slim list ({ records, pagination }, raw un-prefixed ids,
 * field subset). No `.route()` — stays off REST/OpenAPI/MCP.
 */
const all = protectedProcedure
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
  });

export const documentsRouter = {
  all,
  list,
  get,
  delete: del,
  getFileDownloadUrl,
  getChunksDownloadUrl,
};
