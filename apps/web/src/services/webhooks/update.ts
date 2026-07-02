import type { z } from "zod/v4";
import { AgentsetApiError } from "@/lib/api/errors";
import { transformWebhook } from "@/lib/webhook/transform";
import { validateWebhook } from "@/lib/webhook/validate-webhook";

import type { updateWebhookSchema, WebhookProps } from "@agentset/webhooks";
import { db } from "@agentset/db/client";
import { normalizeId } from "@agentset/utils";
import { webhookCache } from "@agentset/webhooks/server";

import { requireWebhooksPlan } from "./plan";
import { toggleWebhook } from "./toggle";

export const updateWebhook = async ({
  organizationId,
  webhookId,
  ...input
}: z.infer<typeof updateWebhookSchema> & {
  organizationId: string;
  webhookId: string;
}) => {
  const existingWebhook = await db.webhook.findUnique({
    where: {
      id: webhookId,
      organizationId,
    },
  });

  if (!existingWebhook) return null;

  await validateWebhook({
    input,
    organizationId,
    webhook: existingWebhook,
  });

  const { name, url, triggers, namespaceIds } = input;

  const webhook = await db.webhook.update({
    where: {
      id: webhookId,
      organizationId,
    },
    data: {
      ...(name && { name }),
      ...(url && { url }),
      ...(triggers && { triggers }),
      ...(namespaceIds !== undefined && {
        namespaces: {
          deleteMany: {},
          ...(namespaceIds.length > 0 && {
            create: namespaceIds.map((namespaceId) => ({
              namespaceId,
            })),
          }),
        },
      }),
    },
    select: {
      id: true,
      name: true,
      url: true,
      secret: true,
      triggers: true,
      disabledAt: true,
      namespaces: {
        select: {
          namespaceId: true,
        },
      },
    },
  });

  // Invalidate webhook cache
  await webhookCache.invalidateOrg(organizationId);

  return transformWebhook(webhook);
};

/**
 * Shared PATCH orchestration for REST and MCP: field updates are pro-gated,
 * toggling `enabled` alone is not.
 */
export const applyWebhookUpdate = async ({
  organizationId,
  plan,
  webhookId,
  enabled,
  ...input
}: z.infer<typeof updateWebhookSchema> & {
  organizationId: string;
  plan: string;
  webhookId: string;
  enabled?: boolean;
}): Promise<WebhookProps> => {
  const hasUpdates =
    input.name !== undefined ||
    input.url !== undefined ||
    input.triggers !== undefined ||
    input.namespaceIds !== undefined;

  if (!hasUpdates && enabled === undefined) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "At least one field must be provided.",
    });
  }

  const notFoundError = () =>
    new AgentsetApiError({
      code: "not_found",
      message: "Webhook not found.",
    });

  let webhook: WebhookProps | null = null;

  if (hasUpdates) {
    requireWebhooksPlan(plan);

    webhook = await updateWebhook({
      organizationId,
      webhookId,
      ...input,
      namespaceIds: input.namespaceIds?.map((id) => normalizeId(id, "ns_")),
    });

    if (!webhook) {
      throw notFoundError();
    }
  }

  if (enabled !== undefined) {
    webhook = await toggleWebhook({
      organizationId,
      webhookId,
      enabled,
    });
  }

  if (!webhook) {
    throw notFoundError();
  }

  return webhook;
};
