import type { z } from "zod/v4";
import { after } from "next/server";
import { nanoid } from "nanoid";

import { db } from "@agentset/db/client";
import { WebhookAddedEmail } from "@agentset/emails";
import { WEBHOOK_ID_PREFIX } from "@agentset/utils";

import type { createWebhookSchema } from "./schemas";
import type { WebhookTrigger } from "./types";
import { sendEmail } from "../resend";
import { webhookCache } from "./cache";
import { createWebhookSecret } from "./secret";

export async function createWebhook({
  name,
  url,
  secret,
  triggers,
  namespaceIds,
  organizationId,
}: z.infer<typeof createWebhookSchema> & {
  organizationId: string;
}) {
  const webhook = await db.webhook.create({
    data: {
      id: `${WEBHOOK_ID_PREFIX}${nanoid(24)}`,
      name,
      url,
      triggers,
      organizationId,
      secret: secret || createWebhookSecret(),
      namespaces: {
        ...(namespaceIds &&
          namespaceIds.length > 0 && {
            create: namespaceIds.map((namespaceId) => ({
              namespaceId,
            })),
          }),
      },
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

  // Update organization webhookEnabled flag and get org details
  const organization = await db.organization.update({
    where: {
      id: organizationId,
    },
    data: {
      webhookEnabled: true,
    },
    select: {
      name: true,
      slug: true,
      members: {
        where: { role: "owner" },
        select: {
          user: {
            select: { email: true },
          },
        },
        take: 1,
      },
    },
  });

  // Cache the webhook
  await webhookCache.set({
    id: webhook.id,
    url: webhook.url,
    secret: webhook.secret,
    triggers: webhook.triggers as WebhookTrigger[],
    disabledAt: webhook.disabledAt,
  });

  // Send webhook added email to organization owner
  const ownerEmail = organization.members[0]?.user.email;
  if (ownerEmail) {
    after(async () => {
      await sendEmail({
        subject: "New webhook added",
        email: ownerEmail,
        react: WebhookAddedEmail({
          email: ownerEmail,
          organization: {
            name: organization.name,
            slug: organization.slug,
          },
          webhook: {
            name: webhook.name,
          },
        }),
      });
    });
  }

  return webhook;
}
