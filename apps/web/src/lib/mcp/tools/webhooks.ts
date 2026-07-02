import { AgentsetApiError } from "@/lib/api/errors";
import { runTool } from "@/lib/mcp/run-tool";
import {
  createWebhookSchema,
  updateWebhookSchema,
  WebhookDetailsSchema,
  WebhookSchema,
  WebhookSummarySchema,
} from "@/schemas/api/webhook";
import { createWebhook } from "@/services/webhooks/create";
import { deleteWebhook } from "@/services/webhooks/delete";
import { getWebhook } from "@/services/webhooks/get";
import { listWebhooks } from "@/services/webhooks/list";
import { requireWebhooksPlan } from "@/services/webhooks/plan";
import { regenerateWebhookSecret } from "@/services/webhooks/regenerate-secret";
import { applyWebhookUpdate } from "@/services/webhooks/update";
import { z } from "zod/v4";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WebhookProps } from "@agentset/webhooks";
import { normalizeId, prefixId } from "@agentset/utils";

const webhookIdSchema = z
  .string()
  .describe(
    "The ID of the webhook to operate on (e.g. `wh_xxx`). Use list_webhooks to find it.",
  );

const webhookNotFoundError = () =>
  new AgentsetApiError({
    code: "not_found",
    message: "Webhook not found.",
  });

// webhook IDs are stored with the wh_ prefix; only namespace IDs need prefixing
const prefixNamespaceIds = <T extends Pick<WebhookProps, "namespaceIds">>(
  webhook: T,
) => ({
  ...webhook,
  namespaceIds: (webhook.namespaceIds ?? []).map((id) => prefixId(id, "ns_")),
});

export const registerWebhookTools = (server: McpServer) => {
  server.registerTool(
    "list_webhooks",
    {
      title: "List webhooks",
      description:
        "List the organization's webhooks (name, URL, triggers, enabled state, and namespace scope). Signing secrets are not included — use get_webhook to retrieve one.",
    },
    async (extra) =>
      runTool(extra, async (ctx) => {
        const webhooks = await listWebhooks({
          organizationId: ctx.organizationId,
        });

        return webhooks.map((webhook) =>
          WebhookSummarySchema.parse(prefixNamespaceIds(webhook)),
        );
      }),
  );

  server.registerTool(
    "get_webhook",
    {
      title: "Get webhook",
      description:
        "Get a webhook by its ID, including its signing secret (`whsec_...`), delivery health (consecutive failures, last failure time), and creation date. Use list_webhooks to find the ID.",
      inputSchema: { webhookId: webhookIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const webhook = await getWebhook({
          organizationId: ctx.organizationId,
          webhookId: args.webhookId,
        });

        if (!webhook) {
          throw webhookNotFoundError();
        }

        return WebhookDetailsSchema.parse(prefixNamespaceIds(webhook));
      }),
  );

  server.registerTool(
    "create_webhook",
    {
      title: "Create webhook",
      description:
        "Create a webhook that receives document and ingest-job lifecycle events via HTTP POST. Scope it to specific namespaces with namespaceIds, or omit them to receive events for the whole organization. The response includes the signing secret. Requires the Pro plan or above.",
      inputSchema: createWebhookSchema.shape,
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        requireWebhooksPlan(ctx.organization.plan);

        const webhook = await createWebhook({
          ...args,
          namespaceIds: args.namespaceIds?.map((id) => normalizeId(id, "ns_")),
          organizationId: ctx.organizationId,
        });

        return WebhookSchema.parse(prefixNamespaceIds(webhook));
      }),
  );

  server.registerTool(
    "update_webhook",
    {
      title: "Update webhook",
      description:
        "Update a webhook's name, URL, triggers, or namespace scope, and/or enable/disable it. At least one field must be provided. Field updates require the Pro plan or above; toggling `enabled` alone does not. Re-enabling a disabled webhook resets its failure count.",
      inputSchema: {
        webhookId: webhookIdSchema,
        ...updateWebhookSchema.shape,
      },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const { webhookId, ...body } = args;

        const webhook = await applyWebhookUpdate({
          organizationId: ctx.organizationId,
          plan: ctx.organization.plan,
          webhookId,
          ...body,
        });

        return WebhookSchema.parse(prefixNamespaceIds(webhook));
      }),
  );

  server.registerTool(
    "delete_webhook",
    {
      title: "Delete webhook",
      description:
        "Permanently delete a webhook by its ID. Events stop being delivered immediately. Use list_webhooks to find the ID.",
      inputSchema: { webhookId: webhookIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const webhook = await deleteWebhook({
          organizationId: ctx.organizationId,
          webhookId: args.webhookId,
        });

        if (!webhook) {
          throw webhookNotFoundError();
        }

        return { deleted: true, id: webhook.id };
      }),
  );

  server.registerTool(
    "regenerate_webhook_secret",
    {
      title: "Regenerate webhook secret",
      description:
        "Generate a new signing secret for a webhook, invalidating the old one immediately. The response includes the new secret (`whsec_...`) — update the receiving endpoint's signature verification before deliveries fail.",
      inputSchema: { webhookId: webhookIdSchema },
    },
    async (args, extra) =>
      runTool(extra, async (ctx) => {
        const webhook = await regenerateWebhookSecret({
          organizationId: ctx.organizationId,
          webhookId: args.webhookId,
        });

        if (!webhook) {
          throw webhookNotFoundError();
        }

        return WebhookSchema.parse(prefixNamespaceIds(webhook));
      }),
  );
};
