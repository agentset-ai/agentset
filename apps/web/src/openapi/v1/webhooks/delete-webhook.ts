import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses } from "@/openapi/responses";

import { makeCodeSamples, ts } from "../code-samples";
import { webhookIdPathSchema } from "./utils";

export const deleteWebhook: ZodOpenApiOperationObject = {
  operationId: "deleteWebhook",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a webhook.",
  description: "Delete a webhook for the authenticated organization.",
  parameters: [webhookIdPathSchema],
  responses: {
    "204": {
      description: "The webhook was deleted",
    },
    ...openApiErrorResponses,
  },
  tags: ["Webhooks"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
await agentset.webhooks.delete("wh_xxx");
console.log("Webhook deleted");
`,
    { isNs: false },
  ),
};
