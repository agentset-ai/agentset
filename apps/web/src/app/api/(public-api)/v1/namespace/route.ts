import { withApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import {
  createNamespaceSchema,
  NamespaceSchema,
} from "@/schemas/api/namespace";
import { createNamespace } from "@/services/namespaces/create";

import { NamespaceStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { prefixId } from "@agentset/utils";

export const GET = withApiHandler(
  async ({ organization, headers }) => {
    const namespaces = await db.namespace.findMany({
      where: {
        organizationId: organization.id,
        status: NamespaceStatus.ACTIVE,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return makeApiSuccessResponse({
      data: namespaces.map((namespace) =>
        NamespaceSchema.parse({
          ...namespace,
          id: prefixId(namespace.id, "ns_"),
          organizationId: prefixId(namespace.organizationId, "org_"),
        }),
      ),
      headers,
    });
  },
  { logging: { routeName: "GET /v1/namespace" } },
);

export const POST = withApiHandler(
  async ({ organization, req, headers }) => {
    const parsed = await createNamespaceSchema.parseAsync(
      await parseRequestBody(req),
    );

    // TODO: check apiScope
    const namespace = await createNamespace({
      organizationId: organization.id,
      data: parsed,
    });

    return makeApiSuccessResponse({
      data: NamespaceSchema.parse({
        ...namespace,
        id: prefixId(namespace.id, "ns_"),
        organizationId: prefixId(namespace.organizationId, "org_"),
      }),
      headers,
      status: 201,
    });
  },
  { logging: { routeName: "POST /v1/namespace" } },
);
