import type { Webhook } from "@agentset/db";
import { WEBHOOK_EVENT_ID_PREFIX } from "@agentset/utils";
import { nanoid } from "nanoid";

import { triggerSendWebhook } from "@agentset/jobs";

import { db } from "@agentset/db/client";

import type { WebhookEventData, WebhookTrigger } from "./types";
import { webhookPayloadSchema } from "./schemas";

// Prepare the webhook payload
const prepareWebhookPayload = (trigger: WebhookTrigger, data: WebhookEventData) => {
  return webhookPayloadSchema.parse({
    id: `${WEBHOOK_EVENT_ID_PREFIX}${nanoid(25)}`,
    data: data,
    event: trigger,
    createdAt: new Date().toISOString(),
  });
};

// Send webhooks to multiple webhooks
export const sendWebhooks = async ({
  webhooks,
  trigger,
  data,
}: {
  webhooks: Pick<Webhook, "id" | "url" | "secret">[];
  trigger: WebhookTrigger;
  data: WebhookEventData;
}) => {
  if (webhooks.length === 0) {
    return;
  }

  const payload = prepareWebhookPayload(trigger, data);

  return await Promise.all(
    webhooks.map((webhook) =>
      triggerSendWebhook({
        webhookId: webhook.id,
        eventId: payload.id,
        event: trigger,
        url: webhook.url,
        secret: webhook.secret,
        payload,
      }),
    ),
  );
};

// Send organization level webhook
export const sendOrganizationWebhook = async ({
  trigger,
  organizationId,
  webhookEnabled,
  data,
  namespaceId,
}: {
  trigger: WebhookTrigger;
  organizationId: string;
  webhookEnabled: boolean;
  data: WebhookEventData;
  namespaceId?: string;
}) => {
  if (!webhookEnabled) {
    return;
  }

  // Find webhooks that match this trigger
  // If namespaceId is provided, also filter by namespace
  const webhooks = await db.webhook.findMany({
    where: {
      organizationId,
      disabledAt: null,
      triggers: {
        array_contains: [trigger],
      },
      // If namespaceId provided, filter to webhooks that either:
      // 1. Have no namespace filters (org-wide)
      // 2. Include the specific namespace
      ...(namespaceId && {
        OR: [
          { namespaces: { none: {} } }, // No namespace filter = org-wide
          { namespaces: { some: { namespaceId } } }, // Includes this namespace
        ],
      }),
    },
    select: {
      id: true,
      url: true,
      secret: true,
    },
  });

  return sendWebhooks({
    trigger,
    webhooks,
    data,
  });
};
