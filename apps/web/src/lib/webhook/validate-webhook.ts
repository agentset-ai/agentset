import type { Webhook } from "@agentset/db";
import type { z } from "zod/v4";

import { db } from "@agentset/db/client";

import { AgentsetApiError } from "../api/errors";
import type { createWebhookSchema } from "./schemas";

export async function validateWebhook({
  input,
  organizationId,
  webhook,
}: {
  input: Partial<z.infer<typeof createWebhookSchema>>;
  organizationId: string;
  webhook?: Webhook;
}) {
  const { url, namespaceIds } = input;

  // Check for duplicate URL in the organization
  if (url) {
    const webhookUrlExists = await db.webhook.findFirst({
      where: {
        organizationId,
        url,
        ...(webhook && {
          id: {
            not: webhook.id,
          },
        }),
      },
    });

    if (webhookUrlExists) {
      throw new AgentsetApiError({
        code: "conflict",
        message: "A Webhook with this URL already exists.",
      });
    }
  }

  // Validate namespace IDs belong to this organization
  if (namespaceIds && namespaceIds.length > 0) {
    const namespaces = await db.namespace.findMany({
      where: {
        id: {
          in: namespaceIds,
        },
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (namespaces.length !== namespaceIds.length) {
      throw new AgentsetApiError({
        code: "bad_request",
        message:
          "Invalid namespace IDs provided. Please check the namespaces you are adding the webhook to.",
      });
    }
  }
}
