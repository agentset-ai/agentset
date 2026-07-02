import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { ApiKeySchema } from "@/schemas/api/api-key";
import { z } from "zod/v4";

import { makeCodeSamples, ts } from "../code-samples";

export const listApiKeys: ZodOpenApiOperationObject = {
  operationId: "listApiKeys",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of API keys",
  description:
    "Retrieve a list of API keys for the authenticated organization. The key material is never returned.",
  responses: {
    "200": {
      description: "The retrieved API keys",
      content: {
        "application/json": {
          schema: successSchema(z.array(ApiKeySchema)),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["API Keys"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
const apiKeys = await agentset.apiKeys.list();
console.log(apiKeys);
`,
    { isNs: false },
  ),
};
