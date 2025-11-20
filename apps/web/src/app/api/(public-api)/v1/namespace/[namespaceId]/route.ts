import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler";
import { prefixId } from "@/lib/api/ids";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import {
  NamespaceSchema,
  updateNamespaceSchema,
} from "@/schemas/api/namespace";
import { deleteNamespace } from "@/services/namespaces/delete";

import { Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";

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
    const { name, slug } = await updateNamespaceSchema.parseAsync(
      await parseRequestBody(req),
    );

    try {
      const updatedNamespace = await db.namespace.update({
        where: {
          id: namespace.id,
        },
        data: {
          ...(name && { name }),
          ...(slug && { slug }),
        },
      });

      return makeApiSuccessResponse({
        data: NamespaceSchema.parse({
          ...updatedNamespace,
          id: prefixId(updatedNamespace.id, "ns_"),
          organizationId: prefixId(namespace.organizationId, "org_"),
        }),
        headers,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AgentsetApiError({
          code: "conflict",
          message: `The slug "${slug}" is already in use.`,
        });
      }

      // let the default error handler handle the error
      throw error;
    }
  },
  { logging: { routeName: "PATCH /v1/namespace/[namespaceId]" } },
);

export const PUT = PATCH;

export const DELETE = withNamespaceApiHandler(
  async ({ namespace, headers }) => {
    // TODO: check apiScope
    await deleteNamespace({ namespaceId: namespace.id });

    return makeApiSuccessResponse({
      data: NamespaceSchema.parse({
        ...namespace,
        id: prefixId(namespace.id, "ns_"),
        organizationId: prefixId(namespace.organizationId, "org_"),
      }),
      headers,
      status: 204,
    });
  },
  { logging: { routeName: "DELETE /v1/namespace/[namespaceId]" } },
);
