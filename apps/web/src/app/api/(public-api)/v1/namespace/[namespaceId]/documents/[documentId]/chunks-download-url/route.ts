import { withNamespaceApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { getDocumentChunksDownloadUrl } from "@/services/documents/download";

export const POST = withNamespaceApiHandler(
  async ({ params, namespace, tenantId, headers }) => {
    const data = await getDocumentChunksDownloadUrl({
      namespaceId: namespace.id,
      documentId: params.documentId ?? "",
      tenantId,
    });

    return makeApiSuccessResponse({
      data,
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
