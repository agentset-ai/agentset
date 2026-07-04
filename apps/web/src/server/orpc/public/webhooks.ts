import { AgentsetApiError } from "@/lib/api/errors";
import {
  createWebhookSchema,
  updateWebhookSchema,
  WebhookDetailsSchema,
  WebhookSchema,
  WebhookSummarySchema,
} from "@/schemas/api/webhook";
import { publicApi, successSchema } from "@/server/orpc/base";
import { createWebhook } from "@/services/webhooks/create";
import { deleteWebhook } from "@/services/webhooks/delete";
import { getWebhook } from "@/services/webhooks/get";
import { listWebhooks } from "@/services/webhooks/list";
import { requireWebhooksPlan } from "@/services/webhooks/plan";
import { regenerateWebhookSecret } from "@/services/webhooks/regenerate-secret";
import { applyWebhookUpdate } from "@/services/webhooks/update";
import { z } from "zod/v4";

import type { WebhookProps } from "@agentset/webhooks";
import { normalizeId, prefixId } from "@agentset/utils";

import { makeCodeSamples, ts } from "./code-samples";

const webhookIdPathSchema = z.string().meta({
  examples: ["wh_123"],
  description: "The id of the webhook (prefixed with wh_)",
  param: {
    in: "path",
    name: "webhookId",
    id: "WebhookIdRef",
  },
});

const webhookNotFoundError = () =>
  new AgentsetApiError({
    code: "not_found",
    message: "Webhook not found.",
  });

const prefixNamespaceIds = <T extends WebhookProps>(webhook: T) => ({
  ...webhook,
  namespaceIds: (webhook.namespaceIds ?? []).map((id) => prefixId(id, "ns_")),
});

// The legacy route parsed the body alone, so the "at least one field" refine
// on `updateWebhookSchema` could fire; with the `webhookId` path param merged
// into the input it is always satisfied, so re-apply it ignoring `webhookId`
// to keep the empty-body 422 (instead of the service's 400 fallback).
const updateWebhookInputSchema = updateWebhookSchema
  .extend({ webhookId: webhookIdPathSchema })
  .refine(
    (body) =>
      Object.keys(body).some(
        (key) =>
          key !== "webhookId" && body[key as keyof typeof body] !== undefined,
      ),
    {
      message: "At least one field must be provided.",
    },
  );

const list = publicApi
  .route({
    method: "GET",
    path: "/webhooks",
    operationId: "listWebhooks",
    summary: "Retrieve a list of webhooks",
    description:
      "Retrieve a list of webhooks for the authenticated organization. The signing secret is not included, retrieve a single webhook to get it.",
    tags: ["Webhooks"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "list",
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const webhooks = await agentset.webhooks.list();
console.log(webhooks);
`,
        { isNs: false },
      ),
    }),
  })
  .output(successSchema(z.array(WebhookSummarySchema)))
  .handler(async ({ context }) => {
    const webhooks = await listWebhooks({
      organizationId: context.organization.id,
    });

    return {
      success: true as const,
      data: webhooks.map(prefixNamespaceIds),
    };
  });

const create = publicApi
  .route({
    method: "POST",
    path: "/webhooks",
    successStatus: 201,
    operationId: "createWebhook",
    summary: "Create a webhook.",
    description:
      "Create a webhook for the authenticated organization. Requires the Pro plan or above.",
    tags: ["Webhooks"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "create",
      "x-speakeasy-usage-example": true,
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const webhook = await agentset.webhooks.create({
  name: "My Webhook",
  url: "https://example.com/webhooks/agentset",
  triggers: ["document.ready", "ingest_job.ready"],
  // namespaceIds: ["ns_xxx"],
});
console.log(webhook);
`,
        { isNs: false },
      ),
    }),
  })
  .input(createWebhookSchema)
  .output(successSchema(WebhookSchema))
  .handler(async ({ context, input }) => {
    requireWebhooksPlan(context.organization.plan);

    const webhook = await createWebhook({
      ...input,
      namespaceIds: input.namespaceIds?.map((id) => normalizeId(id, "ns_")),
      organizationId: context.organization.id,
    });

    return {
      success: true as const,
      data: prefixNamespaceIds(webhook),
    };
  });

const get = publicApi
  .route({
    method: "GET",
    path: "/webhooks/{webhookId}",
    operationId: "getWebhook",
    summary: "Retrieve a webhook",
    description:
      "Retrieve the info for a webhook, including its signing secret and delivery failure stats.",
    tags: ["Webhooks"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "get",
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const webhook = await agentset.webhooks.get("wh_xxx");
console.log(webhook);
`,
        { isNs: false },
      ),
    }),
  })
  .input(z.object({ webhookId: webhookIdPathSchema }))
  .output(successSchema(WebhookDetailsSchema))
  .handler(async ({ context, input }) => {
    const webhook = await getWebhook({
      organizationId: context.organization.id,
      webhookId: input.webhookId,
    });

    if (!webhook) {
      throw webhookNotFoundError();
    }

    return {
      success: true as const,
      data: prefixNamespaceIds(webhook),
    };
  });

const updateHandler = publicApi
  .input(updateWebhookInputSchema)
  .output(successSchema(WebhookSchema))
  .handler(async ({ context, input }) => {
    const { webhookId, ...body } = input;

    const webhook = await applyWebhookUpdate({
      organizationId: context.organization.id,
      plan: context.organization.plan,
      webhookId,
      ...body,
    });

    return {
      success: true as const,
      data: prefixNamespaceIds(webhook),
    };
  });

const update = updateHandler.route({
  method: "PATCH",
  path: "/webhooks/{webhookId}",
  operationId: "updateWebhook",
  summary: "Update a webhook.",
  description:
    "Update a webhook for the authenticated organization. Field updates require the Pro plan or above; enabling/disabling a webhook does not.",
  tags: ["Webhooks"],
  spec: (current) => ({
    ...current,
    "x-speakeasy-name-override": "update",
    "x-speakeasy-max-method-params": 2,
    security: [{ token: [] }],
    ...makeCodeSamples(
      ts`
const updatedWebhook = await agentset.webhooks.update("wh_xxx", {
  name: "Updated Webhook",
  // enabled: false,
});
console.log(updatedWebhook);
`,
      { isNs: false },
    ),
  }),
});

// legacy wire-compat alias, hidden from the generated spec
const updatePut = updateHandler.route({
  method: "PUT",
  path: "/webhooks/{webhookId}",
  tags: ["internal-alias"],
});

const del = publicApi
  .route({
    method: "DELETE",
    path: "/webhooks/{webhookId}",
    successStatus: 204,
    operationId: "deleteWebhook",
    summary: "Delete a webhook.",
    description: "Delete a webhook for the authenticated organization.",
    tags: ["Webhooks"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "delete",
      "x-speakeasy-max-method-params": 1,
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
await agentset.webhooks.delete("wh_xxx");
console.log("Webhook deleted");
`,
        { isNs: false },
      ),
    }),
  })
  .input(z.object({ webhookId: webhookIdPathSchema }))
  .output(z.void())
  .handler(async ({ context, input }) => {
    const webhook = await deleteWebhook({
      organizationId: context.organization.id,
      webhookId: input.webhookId,
    });

    if (!webhook) {
      throw webhookNotFoundError();
    }
  });

const regenerateSecret = publicApi
  .route({
    method: "POST",
    path: "/webhooks/{webhookId}/regenerate-secret",
    operationId: "regenerateWebhookSecret",
    summary: "Regenerate a webhook secret.",
    description:
      "Generate a new signing secret for a webhook. The old secret stops being used immediately.",
    tags: ["Webhooks"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "regenerateSecret",
      "x-speakeasy-max-method-params": 1,
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const webhook = await agentset.webhooks.regenerateSecret("wh_xxx");
console.log(webhook.secret);
`,
        { isNs: false },
      ),
    }),
  })
  .input(z.object({ webhookId: webhookIdPathSchema }))
  .output(successSchema(WebhookSchema))
  .handler(async ({ context, input }) => {
    const webhook = await regenerateWebhookSecret({
      organizationId: context.organization.id,
      webhookId: input.webhookId,
    });

    if (!webhook) {
      throw webhookNotFoundError();
    }

    return {
      success: true as const,
      data: prefixNamespaceIds(webhook),
    };
  });

export const webhooksRouter = {
  list,
  create,
  get,
  update,
  updatePut,
  delete: del,
  regenerateSecret,
};
