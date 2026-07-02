import {
  checkSearchLimit,
  incrementOrganizationSearchUsage,
} from "@/lib/api/usage";
import { resolveNamespace, runTool } from "@/lib/mcp/run-tool";
import { namespaceIdSchema } from "@/lib/mcp/schemas";
import {
  baseQueryVectorStoreSchema,
  queryVectorStoreSchema,
} from "@/schemas/api/query";
import { searchNamespace } from "@/services/search";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const registerSearchTools = (server: McpServer) => {
  server.registerTool(
    "search",
    {
      title: "Search a namespace",
      description:
        "Run a semantic (or keyword) search over the documents of a namespace and get back the most relevant chunks. Documents must be ingested (create_ingest_job) and COMPLETED first. Counts toward the organization's search quota. If a tenant is set via the x-tenant-id header, only that tenant's documents are searched.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        ...baseQueryVectorStoreSchema.shape,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        checkSearchLimit(ctx.organization);

        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const { namespaceId: _namespaceId, ...rest } = args;

        // re-parse to apply the same cross-field validation as the REST route
        const body = await queryVectorStoreSchema.parseAsync(rest);

        const results = await searchNamespace({
          namespace,
          tenantId: ctx.tenantId,
          options: body,
        });

        incrementOrganizationSearchUsage(ctx.organizationId, 1);

        return results;
      }),
  );
};
