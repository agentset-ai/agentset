import { withNamespaceApiHandler } from "@/lib/api/handler";
import { prefixId } from "@agentset/utils";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import {
  NamespaceSchema,
  updateNamespaceSchema,
} from "@/schemas/api/namespace";
import { deleteNamespace } from "@/services/namespaces/delete";
import { updateNamespace } from "@/services/namespaces/update";

export const GET = withNamespaceApiHandler(
  async ({ namespace, headers }) => {
    return makeApiSuccessResponse({
      data: NamespaceSchema.parse({
        ...namespace,
        id: prefixId(namespace.id, "ns_"),
        organizationId: prefixId(namespace.organizationId, "org_"),
      }),
      headers,
    });
  },
  { logging: { routeName: "GET /v1/namespace/[namespaceId]" } },
);

export const PATCH = withNamespaceApiHandler(
  async ({ namespace, headers, req }) => {
    const data = await updateNamespaceSchema.parseAsync(
      await parseRequestBody(req),
    );

    const updatedNamespace = await updateNamespace({
      namespaceId: namespace.id,
      organizationId: namespace.organizationId,
      data,
    });

    return makeApiSuccessResponse({
      data: NamespaceSchema.parse({
        ...updatedNamespace,
        id: prefixId(updatedNamespace.id, "ns_"),
        organizationId: prefixId(namespace.organizationId, "org_"),
      }),
      headers,
    });
  },
  { logging: { routeName: "PATCH /v1/namespace/[namespaceId]" } },
);

export const PUT = PATCH;

export const DELETE = withNamespaceApiHandler(
  async ({ namespace, headers }) => {
    // TODO: check apiScope
    await deleteNamespace({ namespaceId: namespace.id });

    return new Response(null, { status: 204, headers });
  },
  { logging: { routeName: "DELETE /v1/namespace/[namespaceId]" } },
);
