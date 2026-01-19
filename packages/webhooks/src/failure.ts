import type { PrismaClient } from "@agentset/db";

import {
  WEBHOOK_FAILURE_DISABLE_THRESHOLD,
  WEBHOOK_FAILURE_NOTIFY_THRESHOLDS,
} from "./constants";

export interface WebhookFailureResult {
  webhook: {
    id: string;
    url: string;
    consecutiveFailures: number;
    disabledAt: Date | null;
    organizationId: string;
  };
  shouldNotify: boolean;
  shouldDisable: boolean;
  wasDisabled: boolean;
}

export interface HandleWebhookFailureParams {
  db: PrismaClient;
  webhookId: string;
}

/**
 * Handle webhook delivery failure.
 * Increments failure count and determines if notification/disable is needed.
 */
export const handleWebhookFailure = async ({
  db,
  webhookId,
}: HandleWebhookFailureParams): Promise<WebhookFailureResult> => {
  // Update failure count atomically
  const webhook = await db.webhook.update({
    where: { id: webhookId },
    data: {
      consecutiveFailures: { increment: 1 },
      lastFailedAt: new Date(),
    },
    select: {
      id: true,
      url: true,
      consecutiveFailures: true,
      disabledAt: true,
      organizationId: true,
    },
  });

  const shouldNotify =
    !webhook.disabledAt &&
    WEBHOOK_FAILURE_NOTIFY_THRESHOLDS.includes(
      webhook.consecutiveFailures as 5 | 10 | 15,
    );

  const shouldDisable =
    !webhook.disabledAt &&
    webhook.consecutiveFailures >= WEBHOOK_FAILURE_DISABLE_THRESHOLD;

  return {
    webhook,
    shouldNotify,
    shouldDisable,
    wasDisabled: !!webhook.disabledAt,
  };
};

export interface DisableWebhookParams {
  db: PrismaClient;
  webhookId: string;
  organizationId: string;
}

/**
 * Disable a webhook and update organization webhookEnabled flag if needed.
 */
export const disableWebhook = async ({
  db,
  webhookId,
  organizationId,
}: DisableWebhookParams): Promise<void> => {
  await db.webhook.update({
    where: { id: webhookId },
    data: { disabledAt: new Date() },
  });

  // Update organization webhookEnabled flag if no active webhooks remain
  const activeWebhooks = await db.webhook.count({
    where: {
      organizationId,
      disabledAt: null,
    },
  });

  if (activeWebhooks === 0) {
    await db.organization.update({
      where: { id: organizationId },
      data: { webhookEnabled: false },
    });
  }
};

export interface ResetWebhookFailureCountParams {
  db: PrismaClient;
  webhookId: string;
}

/**
 * Reset webhook failure count on successful delivery.
 * Uses atomic update to avoid race conditions.
 */
export const resetWebhookFailureCount = async ({
  db,
  webhookId,
}: ResetWebhookFailureCountParams): Promise<void> => {
  // Atomic reset: only update if there were previous failures
  await db.webhook.updateMany({
    where: { id: webhookId, consecutiveFailures: { gt: 0 } },
    data: {
      consecutiveFailures: 0,
      lastFailedAt: null,
    },
  });
};

export interface GetOrganizationOwnerParams {
  db: PrismaClient;
  organizationId: string;
}

export interface OrganizationOwnerResult {
  email: string;
  organization: {
    name: string;
    slug: string;
  };
}

/**
 * Get organization owner for email notifications.
 */
export const getOrganizationOwner = async ({
  db,
  organizationId,
}: GetOrganizationOwnerParams): Promise<OrganizationOwnerResult | null> => {
  const member = await db.member.findFirst({
    where: { organizationId, role: "owner" },
    select: {
      organization: { select: { name: true, slug: true } },
      user: { select: { email: true } },
    },
  });

  if (!member?.user.email) {
    return null;
  }

  return {
    email: member.user.email,
    organization: member.organization,
  };
};
