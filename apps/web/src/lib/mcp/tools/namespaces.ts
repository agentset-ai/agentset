import { resolveNamespace, runTool } from "@/lib/mcp/run-tool";
import { namespaceIdSchema } from "@/lib/mcp/schemas";
import {
  createNamespaceSchema,
  NamespaceSchema,
  updateNamespaceSchema,
} from "@/schemas/api/namespace";
import { createNamespace } from "@/services/namespaces/create";
import { deleteNamespace } from "@/services/namespaces/delete";
import { updateNamespace } from "@/services/namespaces/update";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Namespace } from "@agentset/db";
import { NamespaceStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { prefixId } from "@agentset/utils";

const toNamespaceResponse = (namespace: Namespace) =>
  NamespaceSchema.parse({
    ...namespace,
    id: prefixId(namespace.id, "ns_"),
    organizationId: prefixId(namespace.organizationId, "org_"),
  });

export const registerNamespaceTools = (server: McpServer) => {
  server.registerTool(
    "list_namespaces",
    {
      title: "List namespaces",
      description:
        "List all active namespaces in the organization. A namespace is an isolated RAG index (documents + vector store). Most other tools require a namespaceId from this list.",
    },
    async (extra) =>
      runTool(extra, async (ctx) => {
        const namespaces = await db.namespace.findMany({
          where: {
            organizationId: ctx.organizationId,
            status: NamespaceStatus.ACTIVE,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        return namespaces.map(toNamespaceResponse);
      }),
  );

  server.registerTool(
    "get_namespace",
    {
      title: "Get namespace",
      description:
        "Get a namespace by ID, including its embedding and vector store configuration.",
      inputSchema: { namespaceId: namespaceIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        return toNamespaceResponse(namespace);
      }),
  );

  server.registerTool(
    "create_namespace",
    {
      title: "Create namespace",
      description:
        "Create a new namespace. Omit embeddingConfig and vectorStoreConfig to use Agentset's managed defaults (recommended); if provided, they cannot be changed after creation. After creating a namespace, upload files with create_upload_urls and ingest them with create_ingest_job.",
      inputSchema: createNamespaceSchema.shape,
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await createNamespace({
          organizationId: ctx.organizationId,
          data: args,
        });

        return toNamespaceResponse(namespace);
      }),
  );

  server.registerTool(
    "update_namespace",
    {
      title: "Update namespace",
      description:
        "Update a namespace's name and/or slug. At least one field must be provided. Embedding and vector store configs cannot be changed.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        ...updateNamespaceSchema.shape,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const { namespaceId: _namespaceId, ...data } = args;

        const updatedNamespace = await updateNamespace({
          namespaceId: namespace.id,
          organizationId: namespace.organizationId,
          data,
        });

        return toNamespaceResponse(updatedNamespace);
      }),
  );

  server.registerTool(
    "delete_namespace",
    {
      title: "Delete namespace",
      description:
        "Delete a namespace and all of its documents and vectors. This is irreversible and processed asynchronously — the namespace immediately stops appearing in list_namespaces.",
      inputSchema: { namespaceId: namespaceIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        await deleteNamespace({ namespaceId: namespace.id });

        return { deleted: true, id: prefixId(namespace.id, "ns_") };
      }),
  );
};
