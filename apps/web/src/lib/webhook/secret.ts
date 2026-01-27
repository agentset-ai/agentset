import { randomBytes } from "crypto";

import { WEBHOOK_SECRET_LENGTH, WEBHOOK_SECRET_PREFIX } from "@agentset/webhooks";

export const createWebhookSecret = () => {
  return `${WEBHOOK_SECRET_PREFIX}${randomBytes(WEBHOOK_SECRET_LENGTH).toString("hex")}`;
};
