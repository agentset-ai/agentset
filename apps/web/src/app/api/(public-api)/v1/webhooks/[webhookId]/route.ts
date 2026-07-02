import { AgentsetApiError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import {
  updateWebhookSchema,
  WebhookDetailsSchema,
  WebhookSchema,
} from "@/schemas/api/webhook";
import { deleteWebhook } from "@/services/webhooks/delete";
import { getWebhook } from "@/services/webhooks/get";
import { applyWebhookUpdate } from "@/services/webhooks/update";

import type { WebhookProps } from "@agentset/webhooks";
import { prefixId } from "@agentset/utils";

const webhookNotFoundError = () =>
  new AgentsetApiError({
    code: "not_found",
    message: "Webhook not found.",
  });

const prefixNamespaceIds = (webhook: WebhookProps) => ({
  ...webhook,
  namespaceIds: (webhook.namespaceIds ?? []).map((id) => prefixId(id, "ns_")),
});

export const GET = withApiHandler(
  async ({ organization, params, headers }) => {
    const webhook = await getWebhook({
      organizationId: organization.id,
      webhookId: params.webhookId ?? "",
    });

    if (!webhook) {
      throw webhookNotFoundError();
    }

    return makeApiSuccessResponse({
      data: WebhookDetailsSchema.parse(prefixNamespaceIds(webhook)),
      headers,
    });
  },
  { logging: { routeName: "GET /v1/webhooks/[webhookId]" } },
);

export const PATCH = withApiHandler(
  async ({ organization, params, headers, req }) => {
    const body = await updateWebhookSchema.parseAsync(
      await parseRequestBody(req),
    );

    const webhook = await applyWebhookUpdate({
      organizationId: organization.id,
      plan: organization.plan,
      webhookId: params.webhookId ?? "",
      ...body,
    });

    return makeApiSuccessResponse({
      data: WebhookSchema.parse(prefixNamespaceIds(webhook)),
      headers,
    });
  },
  { logging: { routeName: "PATCH /v1/webhooks/[webhookId]" } },
);

export const PUT = PATCH;

export const DELETE = withApiHandler(
  async ({ organization, params, headers }) => {
    const webhook = await deleteWebhook({
      organizationId: organization.id,
      webhookId: params.webhookId ?? "",
    });

    if (!webhook) {
      throw webhookNotFoundError();
    }

    return new Response(null, { status: 204, headers });
  },
  { logging: { routeName: "DELETE /v1/webhooks/[webhookId]" } },
);
