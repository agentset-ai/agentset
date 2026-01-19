import type { Webhook } from "@agentset/db";
import {
  WEBHOOK_FAILURE_DISABLE_THRESHOLD,
  WEBHOOK_FAILURE_NOTIFY_THRESHOLDS,
} from "@agentset/utils";

import { db } from "@agentset/db/client";
import { WebhookDisabledEmail, WebhookFailedEmail } from "@agentset/emails";

import { sendEmail } from "../resend";
import { webhookCache } from "./cache";
import { toggleWebhooksForOrganization } from "./update-webhook";

export const handleWebhookFailure = async (webhookId: string) => {
  const webhook = await db.webhook.update({
    where: {
      id: webhookId,
    },
    data: {
      consecutiveFailures: { increment: 1 },
      lastFailedAt: new Date(),
    },
    select: {
      id: true,
      url: true,
      secret: true,
      triggers: true,
      disabledAt: true,
      consecutiveFailures: true,
      lastFailedAt: true,
      organizationId: true,
    },
  });

  if (webhook.disabledAt) {
    return;
  }

  if (
    WEBHOOK_FAILURE_NOTIFY_THRESHOLDS.includes(
      webhook.consecutiveFailures as 5 | 10 | 15,
    )
  ) {
    await notifyWebhookFailure(webhook);
    return;
  }

  if (webhook.consecutiveFailures >= WEBHOOK_FAILURE_DISABLE_THRESHOLD) {
    // Disable the webhook
    const updatedWebhook = await db.webhook.update({
      where: { id: webhookId },
      data: {
        disabledAt: new Date(),
      },
    });

    await Promise.allSettled([
      // Notify the user
      notifyWebhookDisabled(updatedWebhook),

      // Update the webhook cache
      webhookCache.set({
        id: updatedWebhook.id,
        url: updatedWebhook.url,
        secret: updatedWebhook.secret,
        triggers: updatedWebhook.triggers as string[],
        disabledAt: updatedWebhook.disabledAt,
      }),

      // Update the organization webhookEnabled flag
      toggleWebhooksForOrganization({
        organizationId: webhook.organizationId,
      }),
    ]);
  }
};

export const resetWebhookFailureCount = async (webhookId: string) => {
  await db.webhook.update({
    where: { id: webhookId },
    data: {
      consecutiveFailures: 0,
      lastFailedAt: null,
    },
  });
};

// Send email to organization owners when the webhook is failing to deliver
const notifyWebhookFailure = async (
  webhook: Pick<
    Webhook,
    "id" | "url" | "organizationId" | "consecutiveFailures"
  >,
) => {
  const orgOwner = await db.member.findFirst({
    where: { organizationId: webhook.organizationId, role: "owner" },
    select: {
      organization: {
        select: {
          name: true,
          slug: true,
        },
      },
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!orgOwner?.user.email) {
    return;
  }

  const email = orgOwner.user.email;
  const organization = orgOwner.organization;

  await sendEmail({
    subject: "Webhook is failing to deliver",
    email,
    react: WebhookFailedEmail({
      email,
      organization: {
        name: organization.name,
        slug: organization.slug,
      },
      webhook: {
        id: webhook.id,
        url: webhook.url,
        consecutiveFailures: webhook.consecutiveFailures,
        disableThreshold: WEBHOOK_FAILURE_DISABLE_THRESHOLD,
      },
    }),
  });
};

// Send email to the organization owners when the webhook has been disabled
const notifyWebhookDisabled = async (
  webhook: Pick<Webhook, "id" | "url" | "organizationId">,
) => {
  const orgOwner = await db.member.findFirst({
    where: { organizationId: webhook.organizationId, role: "owner" },
    select: {
      organization: {
        select: {
          name: true,
          slug: true,
        },
      },
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!orgOwner?.user.email) {
    return;
  }

  const email = orgOwner.user.email;
  const organization = orgOwner.organization;

  await sendEmail({
    subject: "Webhook has been disabled",
    email,
    react: WebhookDisabledEmail({
      email,
      organization: {
        name: organization.name,
        slug: organization.slug,
      },
      webhook: {
        id: webhook.id,
        url: webhook.url,
        disableThreshold: WEBHOOK_FAILURE_DISABLE_THRESHOLD,
      },
    }),
  });
};
