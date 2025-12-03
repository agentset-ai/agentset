/**
 * Public API Documents Router
 *
 * Handles document operations for public API routes.
 */

import { AgentsetApiError } from "@/lib/api/errors";
import { normalizeId, prefixId } from "@/lib/api/ids";
import { DocumentSchema, getDocumentsSchema } from "@/schemas/api/document";
import { apiSuccessSchema } from "@/schemas/api/response";
import { deleteDocument } from "@/services/documents/delete";
import { getPaginationArgs, paginateResults } from "@/services/pagination";
import { createPublicContext } from "@/services/shared/create-public-context";
import { getNamespace as getNamespaceAccess } from "@/services/shared/namespace-access";
import { z } from "zod/v4";

import { DocumentStatus } from "@agentset/db";

import { publicApiProcedure } from "../orpc";

export const documentsRouter = {
  /**
   * List documents in a namespace
   */
  list: publicApiProcedure
    .route({ method: "GET", path: "/namespace/{namespaceId}/documents" })
    .input(
      z
        .object({
          namespaceId: z.string(),
        })
        .extend(getDocumentsSchema.shape),
    )
    .output(
      apiSuccessSchema(
        z.object({
          records: z.array(DocumentSchema),
          pagination: z.any(), // TODO: Use proper pagination schema
        }),
      ),
    )
    .handler(async ({ context, input }) => {
      const { namespaceId: rawNamespaceId, ...query } = input;
      const namespaceId = normalizeId(rawNamespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const { where, ...paginationArgs } = getPaginationArgs(
        query,
        {
          orderBy: query.orderBy,
          order: query.order,
        },
        "doc_",
      );

      const documents = await context.db.document.findMany({
        where: {
          tenantId: context.tenantId,
          namespaceId: namespace.id,
          ...(query.ingestJobId && {
            ingestJobId: normalizeId(query.ingestJobId, "job_"),
          }),
          ...(query.statuses &&
            query.statuses.length > 0 && { status: { in: query.statuses } }),
          ...where,
        },
        ...paginationArgs,
      });

      const paginated = paginateResults(
        query,
        documents.map((doc) =>
          DocumentSchema.parse({
            ...doc,
            ingestJobId: prefixId(doc.ingestJobId, "job_"),
            id: prefixId(doc.id, "doc_"),
          }),
        ),
      );

      return {
        success: true,
        data: {
          records: paginated.records,
          pagination: paginated.pagination,
        },
      };
    }),

  /**
   * Get a document by ID
   */
  get: publicApiProcedure
    .route({
      method: "GET",
      path: "/namespace/{namespaceId}/documents/{documentId}",
    })
    .input(
      z.object({
        namespaceId: z.string(),
        documentId: z.string(),
      }),
    )
    .output(apiSuccessSchema(DocumentSchema))
    .handler(async ({ context, input }) => {
      const namespaceId = normalizeId(input.namespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const documentId = normalizeId(input.documentId, "doc_");
      if (!documentId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid document ID",
        });
      }

      const doc = await context.db.document.findUnique({
        where: {
          id: documentId,
          namespaceId: namespace.id,
        },
      });

      if (!doc) {
        throw new AgentsetApiError({
          code: "not_found",
          message: "Document not found",
        });
      }

      const data = DocumentSchema.parse({
        ...doc,
        id: prefixId(doc.id, "doc_"),
        ingestJobId: prefixId(doc.ingestJobId, "job_"),
      });
      return { success: true, data };
    }),

  /**
   * Delete a document
   */
  delete: publicApiProcedure
    .route({
      method: "DELETE",
      path: "/namespace/{namespaceId}/documents/{documentId}",
    })
    .input(
      z.object({
        namespaceId: z.string(),
        documentId: z.string(),
      }),
    )
    .output(apiSuccessSchema(DocumentSchema))
    .handler(async ({ context, input }) => {
      const namespaceId = normalizeId(input.namespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const documentId = normalizeId(input.documentId, "doc_");
      if (!documentId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid document ID",
        });
      }

      const document = await context.db.document.findUnique({
        where: {
          id: documentId,
          namespaceId: namespace.id,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!document) {
        throw new AgentsetApiError({
          code: "not_found",
          message: "Document not found",
        });
      }

      if (
        document.status === DocumentStatus.QUEUED_FOR_DELETE ||
        document.status === DocumentStatus.DELETING
      ) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Document is already being deleted",
        });
      }

      const deletedDoc = await deleteDocument(serviceContext, {
        documentId: document.id,
        namespaceId: namespace.id,
      });

      const data = DocumentSchema.parse({
        ...deletedDoc,
        id: prefixId(deletedDoc.id, "doc_"),
        ingestJobId: prefixId(deletedDoc.ingestJobId, "job_"),
      });
      return { success: true, data };
    }),
};
