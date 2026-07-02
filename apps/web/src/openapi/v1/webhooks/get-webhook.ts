import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { WebhookDetailsSchema } from "@/schemas/api/webhook";

import { makeCodeSamples, ts } from "../code-samples";
import { webhookIdPathSchema } from "./utils";

export const getWebhook: ZodOpenApiOperationObject = {
  operationId: "getWebhook",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve a webhook",
  description:
    "Retrieve the info for a webhook, including its signing secret and delivery failure stats.",
  parameters: [webhookIdPathSchema],
  responses: {
    "200": {
      description: "The retrieved webhook",
      content: {
        "application/json": {
          schema: successSchema(WebhookDetailsSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Webhooks"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
const webhook = await agentset.webhooks.get("wh_xxx");
console.log(webhook);
`,
    { isNs: false },
  ),
};
