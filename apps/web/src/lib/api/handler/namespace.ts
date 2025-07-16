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

export const withNamespaceApiHandler = (handler: NamespaceHandler) => {
  return withApiHandler(async (params) => {
    const namespaceId = normalizeId(params.params.namespaceId ?? "", "ns_");
    if (!namespaceId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid namespace ID.",
      });
    }

    const namespace = await db.namespace.findUnique({
      where: {
        id: namespaceId,
        status: NamespaceStatus.ACTIVE,
      },
    });

    if (!namespace || namespace.organizationId !== params.organization.id) {
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
