import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";

import { DocumentStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { presignChunksDownloadUrl } from "@agentset/storage";
import { normalizeId } from "@agentset/utils";

export const POST = withNamespaceApiHandler(
  async ({ params, namespace, headers }) => {
    const documentId = normalizeId(params.documentId ?? "", "doc_");
    if (!documentId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid document ID",
      });
    }

    const document = await db.document.findUnique({
      where: {
        id: documentId,
        namespaceId: namespace.id,
      },
      select: { id: true, status: true },
    });

    if (!document) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Document not found",
      });
    }

    if (document.status !== DocumentStatus.COMPLETED) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Chunks are only available for completed documents",
      });
    }

    const url = await presignChunksDownloadUrl(namespace.id, document.id);
    if (!url) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Chunks file not found",
      });
    }

    return makeApiSuccessResponse({
      data: { url },
      headers,
    });
  },
  {
    logging: {
      routeName:
        "POST /v1/namespace/[namespaceId]/documents/[documentId]/chunks-download-url",
    },
  },
);
