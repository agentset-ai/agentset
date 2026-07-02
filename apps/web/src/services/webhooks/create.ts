import type { z } from "zod/v4";
import { createWebhook as createWebhookRecord } from "@/lib/webhook/create-webhook";
import { transformWebhook } from "@/lib/webhook/transform";
import { validateWebhook } from "@/lib/webhook/validate-webhook";

import type { createWebhookSchema } from "@agentset/webhooks";

export const createWebhook = async ({
  organizationId,
  ...input
}: z.infer<typeof createWebhookSchema> & {
  organizationId: string;
}) => {
  await validateWebhook({ input, organizationId });

  const webhook = await createWebhookRecord({
    ...input,
    organizationId,
  });

  return transformWebhook(webhook);
};
