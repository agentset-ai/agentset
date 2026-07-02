import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { updateWebhookSchema, WebhookSchema } from "@/schemas/api/webhook";

import { makeCodeSamples, ts } from "../code-samples";
import { webhookIdPathSchema } from "./utils";

export const updateWebhook: ZodOpenApiOperationObject = {
  operationId: "updateWebhook",
  "x-speakeasy-name-override": "update",
  "x-speakeasy-max-method-params": 2,
  summary: "Update a webhook.",
  description:
    "Update a webhook for the authenticated organization. Field updates require the Pro plan or above; enabling/disabling a webhook does not.",
  parameters: [webhookIdPathSchema],
  requestBody: {
    required: true,
    content: {
      "application/json": { schema: updateWebhookSchema },
    },
  },
  responses: {
    "200": {
      description: "The updated webhook",
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
const updatedWebhook = await agentset.webhooks.update("wh_xxx", {
  name: "Updated Webhook",
  // enabled: false,
});
console.log(updatedWebhook);
`,
    { isNs: false },
  ),
};
