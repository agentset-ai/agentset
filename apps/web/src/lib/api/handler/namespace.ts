import { unstable_cache } from "next/cache";
import {
  flushServerEvents,
  identifyOrganization,
  logServerEvent,
} from "@/lib/analytics-server";

import type { Namespace } from "@agentset/db";
import { NamespaceStatus } from "@agentset/db";
import { db } from "@agentset/db/client";

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

const getNamespace = async ({
  namespaceId,
  organizationId,
}: {
  namespaceId: string;
  organizationId: string;
}) => {
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
      tags: [`org:${organizationId}`, `ns:${namespaceId}`],
    },
  )();
};

export const withNamespaceApiHandler = (
  handler: NamespaceHandler,
  { logging }: { logging: false | { routeName: string } },
) => {
  return withApiHandler(
    async (params) => {
      const namespaceId = normalizeId(params.params.namespaceId ?? "", "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const namespace = await getNamespace({
        namespaceId,
        organizationId: params.organization.id,
      });

      if (!namespace) {
        throw new AgentsetApiError({
          code: "unauthorized",
          message: "Unauthorized: You don't have access to this namespace.",
        });
      }

      const response = await handler({
        ...params,
        namespace,
      });

      if (logging) {
        identifyOrganization(params.organization);

        // log request
        logServerEvent(
          "api_request",
          {
            request: params.req,
            routeName: logging.routeName,
            response,
            organization: params.organization,
          },
          { namespaceId: namespace.id, tenantId: params.tenantId },
        );

        flushServerEvents();
      }

      return response;
    },
    { logging: false },
  );
};
