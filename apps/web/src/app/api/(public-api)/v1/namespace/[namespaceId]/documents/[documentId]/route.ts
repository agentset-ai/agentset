import { withNamespaceApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { DocumentSchema } from "@/schemas/api/document";
import { queueDocumentDeletion } from "@/services/documents/delete";
import { getDocumentOrThrow } from "@/services/documents/get";

import { prefixId } from "@agentset/utils";

export const GET = withNamespaceApiHandler(
  async ({ params, namespace, tenantId, headers }) => {
    const doc = await getDocumentOrThrow({
      namespaceId: namespace.id,
      documentId: params.documentId ?? "",
      tenantId,
    });

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
  async ({ params, namespace, tenantId, headers }) => {
    // TODO: check apiScope
    const data = await queueDocumentDeletion({
      namespaceId: namespace.id,
      organizationId: namespace.organizationId,
      documentId: params.documentId ?? "",
      tenantId,
    });

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
