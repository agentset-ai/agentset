import { withNamespaceApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import { updateMetadataSchema } from "@/schemas/api/metadata";
import { queueMetadataUpdate } from "@/services/metadata/update";

export const PATCH = withNamespaceApiHandler(
  async ({ req, namespace, tenantId, headers }) => {
    const data = await updateMetadataSchema.parseAsync(
      await parseRequestBody(req),
    );
    const result = await queueMetadataUpdate({
      namespaceId: namespace.id,
      tenantId,
      target: "documents",
      data,
    });

    return makeApiSuccessResponse({
      data: result,
      status: result.runId ? 202 : 200,
      headers,
    });
  },
  {
    logging: {
      routeName: "PATCH /v1/namespace/[namespaceId]/documents/metadata",
    },
  },
);
