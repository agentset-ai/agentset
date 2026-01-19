import type { Webhook } from "@agentset/db";

import type { WebhookTrigger } from "./types";
import { WebhookSchema } from "./schemas";

interface TransformWebhookProps
  extends Pick<
    Webhook,
    "id" | "name" | "url" | "secret" | "triggers" | "disabledAt"
  > {
  namespaces: { namespaceId: string }[];
}

// Transform webhook for API response
export const transformWebhook = (webhook: TransformWebhookProps) => {
  return WebhookSchema.parse({
    ...webhook,
    triggers: webhook.triggers as WebhookTrigger[],
    namespaceIds: webhook.namespaces.map(({ namespaceId }) => namespaceId),
  });
};
