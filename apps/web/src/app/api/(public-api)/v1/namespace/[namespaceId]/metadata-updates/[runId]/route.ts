import { withNamespaceApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { getMetadataUpdateStatus } from "@/services/metadata/update";

export const GET = withNamespaceApiHandler(
  async ({ params, namespace, tenantId, headers }) => {
    const data = await getMetadataUpdateStatus({
      namespaceId: namespace.id,
      tenantId,
      runId: params.runId ?? "",
    });
    return makeApiSuccessResponse({ data, headers });
  },
  {
    logging: {
      routeName: "GET /v1/namespace/[namespaceId]/metadata-updates/[runId]",
    },
  },
);
