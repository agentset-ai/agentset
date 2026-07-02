import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { createWebhookSchema, WebhookSchema } from "@/schemas/api/webhook";

import { makeCodeSamples, ts } from "../code-samples";

export const createWebhook: ZodOpenApiOperationObject = {
  operationId: "createWebhook",
  "x-speakeasy-name-override": "create",
  "x-speakeasy-usage-example": true,
  summary: "Create a webhook.",
  description:
    "Create a webhook for the authenticated organization. Requires the Pro plan or above.",
  requestBody: {
    required: true,
    content: {
      "application/json": { schema: createWebhookSchema },
    },
  },
  responses: {
    "201": {
      description: "The created webhook",
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
const webhook = await agentset.webhooks.create({
  name: "My Webhook",
  url: "https://example.com/webhooks/agentset",
  triggers: ["document.ready", "ingest_job.ready"],
  // namespaceIds: ["ns_xxx"],
});
console.log(webhook);
`,
    { isNs: false },
  ),
};
