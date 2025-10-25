import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";

import { getNamespaceVectorStore } from "@agentset/engine";

export const POST = withNamespaceApiHandler(
  async ({ namespace, headers, tenantId }) => {
    const vectorStore = await getNamespaceVectorStore(namespace, tenantId);
    const result = await vectorStore.warmCache();

    if (result === "UNSUPPORTED") {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Warm cache is not supported for this vector store",
      });
    }

    return makeApiSuccessResponse({
      data: { status: true },
      headers,
    });
  },
  { logging: { routeName: "POST /v1/namespace/[namespaceId]/warm-up" } },
);
