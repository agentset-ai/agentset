import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { WebhookSchema } from "@/schemas/api/webhook";

import { makeCodeSamples, ts } from "../code-samples";
import { webhookIdPathSchema } from "./utils";

export const regenerateWebhookSecret: ZodOpenApiOperationObject = {
  operationId: "regenerateWebhookSecret",
  "x-speakeasy-name-override": "regenerateSecret",
  "x-speakeasy-max-method-params": 1,
  summary: "Regenerate a webhook secret.",
  description:
    "Generate a new signing secret for a webhook. The old secret stops being used immediately.",
  parameters: [webhookIdPathSchema],
  responses: {
    "200": {
      description: "The webhook with its new secret",
      content: {
        "application/json": {
          schema: successSchema(WebhookSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Webhooks"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
const webhook = await agentset.webhooks.regenerateSecret("wh_xxx");
console.log(webhook.secret);
`,
    { isNs: false },
  ),
};
