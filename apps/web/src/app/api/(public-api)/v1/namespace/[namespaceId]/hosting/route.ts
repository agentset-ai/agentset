import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler/namespace";
import { prefixId } from "@/lib/api/ids";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import { HostingSchema, updateHostingSchema } from "@/schemas/api/hosting";
import { deleteHosting } from "@/services/hosting/delete";
import { enableHosting } from "@/services/hosting/enable";
import { getHosting } from "@/services/hosting/get";
import { updateHosting } from "@/services/hosting/update";

export const GET = withNamespaceApiHandler(
  async ({ namespace, headers }) => {
    const hosting = await getHosting({ namespaceId: namespace.id });

    if (!hosting) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Hosting not found for this namespace.",
      });
    }

    return makeApiSuccessResponse({
      data: HostingSchema.parse({
        ...hosting,
        namespaceId: prefixId(hosting.namespaceId, "ns_"),
      }),
      headers,
    });
  },
  { logging: { routeName: "GET /v1/namespace/[namespaceId]/hosting" } },
);

export const POST = withNamespaceApiHandler(
  async ({ namespace, headers }) => {
    const hosting = await enableHosting({ namespaceId: namespace.id });

    return makeApiSuccessResponse({
      data: HostingSchema.parse({
        ...hosting,
        namespaceId: prefixId(hosting.namespaceId, "ns_"),
      }),
      headers,
      status: 201,
    });
  },
  { logging: { routeName: "POST /v1/namespace/[namespaceId]/hosting" } },
);

export const PATCH = withNamespaceApiHandler(
  async ({ namespace, headers, req }) => {
    const body = await updateHostingSchema.parseAsync(
      await parseRequestBody(req),
    );

    const updatedHosting = await updateHosting({
      namespaceId: namespace.id,
      input: body,
    });

    return makeApiSuccessResponse({
      data: HostingSchema.parse({
        ...updatedHosting,
        namespaceId: prefixId(updatedHosting.namespaceId, "ns_"),
      }),
      headers,
    });
  },
  { logging: { routeName: "PATCH /v1/namespace/[namespaceId]/hosting" } },
);

export const PUT = PATCH;

export const DELETE = withNamespaceApiHandler(
  async ({ namespace, headers }) => {
    const hosting = await getHosting({ namespaceId: namespace.id });

    if (!hosting) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Hosting not found for this namespace.",
      });
    }

    await deleteHosting({ namespaceId: namespace.id });

    return makeApiSuccessResponse({
      data: HostingSchema.parse({
        ...hosting,
        namespaceId: prefixId(hosting.namespaceId, "ns_"),
      }),
      headers,
      status: 204,
    });
  },
  { logging: { routeName: "DELETE /v1/namespace/[namespaceId]/hosting" } },
);
