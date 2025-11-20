import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler";
import { normalizeId, prefixId } from "@/lib/api/ids";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { DocumentSchema } from "@/schemas/api/document";
import { deleteDocument } from "@/services/documents/delete";

import { DocumentStatus } from "@agentset/db";
import { db } from "@agentset/db/client";

export const GET = withNamespaceApiHandler(
  async ({ params, namespace, headers }) => {
    const documentId = normalizeId(params.documentId ?? "", "doc_");
    if (!documentId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid document ID",
      });
    }

    const doc = await db.document.findUnique({
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

    return makeApiSuccessResponse({
      data: DocumentSchema.parse({
        ...doc,
        id: prefixId(doc.id, "doc_"),
        ingestJobId: prefixId(doc.ingestJobId, "job_"),
      }),
      headers,
    });
  },
  {
    logging: {
      routeName: "GET /v1/namespace/[namespaceId]/documents/[documentId]",
    },
  },
);

export const DELETE = withNamespaceApiHandler(
  async ({ params, namespace, headers }) => {
    const documentId = normalizeId(params.documentId ?? "", "doc_");
    if (!documentId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid document ID",
      });
    }

    // TODO: check apiScope
    const document = await db.document.findUnique({
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

    const data = await deleteDocument(document.id);

    return makeApiSuccessResponse({
      data: DocumentSchema.parse({
        ...data,
        id: prefixId(data.id, "doc_"),
        ingestJobId: prefixId(data.ingestJobId, "job_"),
      }),
      headers,
    });
  },
  {
    logging: {
      routeName: "DELETE /v1/namespace/[namespaceId]/documents/[documentId]",
    },
  },
);
