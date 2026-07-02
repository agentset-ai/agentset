import { AgentsetApiError } from "@/lib/api/errors";
import { resolveNamespace, runTool } from "@/lib/mcp/run-tool";
import { namespaceIdSchema } from "@/lib/mcp/schemas";
import {
  addDomainSchema,
  DomainSchema,
  DomainStatusSchema,
  HostingSchema,
  updateHostingSchema,
} from "@/schemas/api/hosting";
import { addDomain } from "@/services/domains/add";
import { checkDomainStatus } from "@/services/domains/check-status";
import { removeDomain } from "@/services/domains/remove";
import { deleteHosting } from "@/services/hosting/delete";
import { enableHosting } from "@/services/hosting/enable";
import { getHosting } from "@/services/hosting/get";
import { updateHosting } from "@/services/hosting/update";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prefixId } from "@agentset/utils";

type HostingResult = NonNullable<Awaited<ReturnType<typeof getHosting>>>;

const toHostingResponse = (
  hosting: Omit<HostingResult, "domain"> & {
    domain?: HostingResult["domain"];
  },
) =>
  HostingSchema.parse({
    ...hosting,
    namespaceId: prefixId(hosting.namespaceId, "ns_"),
  });

const getHostingOrThrow = async (namespaceId: string) => {
  const hosting = await getHosting({ namespaceId });

  if (!hosting) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Hosting is not enabled for this namespace.",
    });
  }

  return hosting;
};

export const registerHostingTools = (server: McpServer) => {
  server.registerTool(
    "get_hosting",
    {
      title: "Get hosting",
      description:
        "Get the hosted chat/search interface configuration of a namespace, including its slug and custom domain (if any). Returns not_found when hosting has not been enabled — use enable_hosting first.",
      inputSchema: { namespaceId: namespaceIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const hosting = await getHosting({ namespaceId: namespace.id });

        if (!hosting) {
          throw new AgentsetApiError({
            code: "not_found",
            message: "Hosting not found for this namespace.",
          });
        }

        return toHostingResponse(hosting);
      }),
  );

  server.registerTool(
    "enable_hosting",
    {
      title: "Enable hosting",
      description:
        "Enable a hosted chat/search interface for a namespace. A unique slug is generated automatically; customize the page afterwards with update_hosting and optionally attach a custom domain with set_custom_domain.",
      inputSchema: { namespaceId: namespaceIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const hosting = await enableHosting({ namespaceId: namespace.id });

        return toHostingResponse(hosting);
      }),
  );

  server.registerTool(
    "update_hosting",
    {
      title: "Update hosting",
      description:
        "Update the hosted interface of a namespace: title, slug, logo, Open Graph metadata, system prompt, example questions/search queries, welcome message, access protection (allowed emails/domains), search toggle, and retrieval settings (rerank model/limit, LLM model, topK). Hosting must be enabled first.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        ...updateHostingSchema.shape,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const { namespaceId: _namespaceId, ...input } = args;

        const updatedHosting = await updateHosting({
          namespaceId: namespace.id,
          input,
        });

        return toHostingResponse(updatedHosting);
      }),
  );

  server.registerTool(
    "disable_hosting",
    {
      title: "Disable hosting",
      description:
        "Disable and delete the hosted interface of a namespace, removing its custom domain (if any). The namespace and its documents are not affected.",
      inputSchema: { namespaceId: namespaceIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        await deleteHosting({ namespaceId: namespace.id });

        return { deleted: true };
      }),
  );

  server.registerTool(
    "set_custom_domain",
    {
      title: "Set custom domain",
      description:
        "Attach a custom domain (e.g. docs.example.com) to the hosted interface of a namespace. Hosting must be enabled first, and only one domain can be set at a time. After setting it, call get_domain_status to retrieve the DNS records required for verification. Errors clearly if the deployment has no Vercel credentials configured.",
      inputSchema: {
        namespaceId: namespaceIdSchema,
        ...addDomainSchema.shape,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const hosting = await getHostingOrThrow(namespace.id);

        const domain = await addDomain({
          hostingId: hosting.id,
          domain: args.domain,
        });

        return DomainSchema.parse(domain);
      }),
  );

  server.registerTool(
    "get_domain_status",
    {
      title: "Get domain status",
      description:
        "Check the verification/configuration status of the custom domain attached to a namespace's hosted interface. When the status is 'Pending Verification', the response lists the DNS records to set; when there are conflicts, it lists the conflicting records to remove. Errors clearly if the deployment has no Vercel credentials configured.",
      inputSchema: { namespaceId: namespaceIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const hosting = await getHostingOrThrow(namespace.id);

        if (!hosting.domain) {
          throw new AgentsetApiError({
            code: "not_found",
            message: "No custom domain is set for this namespace.",
          });
        }

        const { status, response } = await checkDomainStatus({
          hostingId: hosting.id,
        });

        // the Vercel responses omit fields when the domain is not found,
        // the schema defaults fill those in
        return DomainStatusSchema.parse({
          domain: hosting.domain.slug,
          status,
          verified: status === "Valid Configuration",
          apexName: response.domainJson.apexName,
          verification: response.domainJson.verification,
          conflicts: response.configJson.conflicts,
          misconfigured: response.configJson.misconfigured,
        });
      }),
  );

  server.registerTool(
    "remove_custom_domain",
    {
      title: "Remove custom domain",
      description:
        "Detach the custom domain from a namespace's hosted interface. The hosted interface remains available on its Agentset slug. Errors clearly if the deployment has no Vercel credentials configured.",
      inputSchema: { namespaceId: namespaceIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const namespace = await resolveNamespace(ctx, args.namespaceId);
        const hosting = await getHostingOrThrow(namespace.id);

        await removeDomain({ hostingId: hosting.id });

        return { deleted: true };
      }),
  );
};
