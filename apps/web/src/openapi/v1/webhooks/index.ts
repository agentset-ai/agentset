import type { ZodOpenApiPathsObject } from "zod-openapi";

import { createWebhook } from "./create-webhook";
import { deleteWebhook } from "./delete-webhook";
import { getWebhook } from "./get-webhook";
import { listWebhooks } from "./list-webhooks";
import { regenerateWebhookSecret } from "./regenerate-webhook-secret";
import { updateWebhook } from "./update-webhook";

export const webhooksPaths: ZodOpenApiPathsObject = {
  "/v1/webhooks": {
    get: listWebhooks,
    post: createWebhook,
  },
  "/v1/webhooks/{webhookId}": {
    get: getWebhook,
    patch: updateWebhook,
    delete: deleteWebhook,
  },
  "/v1/webhooks/{webhookId}/regenerate-secret": {
    post: regenerateWebhookSecret,
  },
};
