import { unstable_cache } from "next/cache";

import type { Namespace } from "@agentset/db";
import { db, NamespaceStatus } from "@agentset/db";

import type { HandlerParams } from "./base";
import { AgentsetApiError } from "../errors";
import { normalizeId } from "../ids";
import { withApiHandler } from "./base";

interface NamespaceHandler {
  (
    params: HandlerParams & {
      namespace: Namespace;
    },
  ): Promise<Response>;
}

const getNamespace = async (namespaceId: string, organizationId: string) => {
  return unstable_cache(
    async () => {
      return await db.namespace.findUnique({
        where: {
          id: namespaceId,
          status: NamespaceStatus.ACTIVE,
          organizationId: organizationId,
        },
      });
    },
    ["namespace", namespaceId, organizationId],
    {
      revalidate: 60 * 5, // 5 minutes
      tags: [`org:${organizationId}_ns:${namespaceId}`],
    },
  )();
};

export const withNamespaceApiHandler = (handler: NamespaceHandler) => {
  return withApiHandler(async (params) => {
    const namespaceId = normalizeId(params.params.namespaceId ?? "", "ns_");
    if (!namespaceId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid namespace ID.",
      });
    }

    const namespace = await getNamespace(namespaceId, params.organization.id);

    if (!namespace) {
      throw new AgentsetApiError({
        code: "unauthorized",
        message: "Unauthorized: You don't have access to this namespace.",
      });
    }

    return await handler({
      ...params,
      namespace,
    });
  });
};
