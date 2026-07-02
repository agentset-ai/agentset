import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { WebhookSummarySchema } from "@/schemas/api/webhook";
import { z } from "zod/v4";

import { makeCodeSamples, ts } from "../code-samples";

export const listWebhooks: ZodOpenApiOperationObject = {
  operationId: "listWebhooks",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of webhooks",
  description:
    "Retrieve a list of webhooks for the authenticated organization. The signing secret is not included, retrieve a single webhook to get it.",
  responses: {
    "200": {
      description: "The retrieved webhooks",
      content: {
        "application/json": {
          schema: successSchema(z.array(WebhookSummarySchema)),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Webhooks"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
const webhooks = await agentset.webhooks.list();
console.log(webhooks);
`,
    { isNs: false },
  ),
};
