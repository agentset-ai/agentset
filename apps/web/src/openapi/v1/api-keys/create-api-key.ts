import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import {
  createApiKeyBodySchema,
  CreatedApiKeySchema,
} from "@/schemas/api/api-key";

import { makeCodeSamples, ts } from "../code-samples";

export const createApiKey: ZodOpenApiOperationObject = {
  operationId: "createApiKey",
  "x-speakeasy-name-override": "create",
  summary: "Create an API key",
  description:
    "Create an API key for the authenticated organization. The full key is only returned once, at creation time.",
  requestBody: {
    required: true,
    content: {
      "application/json": { schema: createApiKeyBodySchema },
    },
  },
  responses: {
    "201": {
      description: "The created API key",
      content: {
        "application/json": {
          schema: successSchema(CreatedApiKeySchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["API Keys"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
const apiKey = await agentset.apiKeys.create({
  label: "My API Key",
});
console.log(apiKey.key);
`,
    { isNs: false },
  ),
};
