import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";

import { db } from "@agentset/db/client";
import { presignGetUrl } from "@agentset/storage";
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
      select: { id: true, name: true, source: true },
    });

    if (!document) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Document not found",
      });
    }

    if (document.source.type !== "MANAGED_FILE") {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "File download is only available for managed files",
      });
    }

    const { url } = await presignGetUrl(document.source.key, {
      fileName: document.name ?? undefined,
    });

    return makeApiSuccessResponse({
      data: { url },
      headers,
    });
  },
  {
    logging: {
      routeName:
        "POST /v1/namespace/[namespaceId]/documents/[documentId]/file-download-url",
    },
  },
);
