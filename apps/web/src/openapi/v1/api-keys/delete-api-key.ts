import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses } from "@/openapi/responses";
import { z } from "zod/v4";

import { makeCodeSamples, ts } from "../code-samples";

const keyIdPathSchema = z.string().meta({
  examples: ["cm4x1q2z90000abcd1234efgh"],
  description: "The id of the API key.",
  param: {
    in: "path",
    name: "keyId",
    id: "ApiKeyIdRef",
  },
});

export const deleteApiKey: ZodOpenApiOperationObject = {
  operationId: "deleteApiKey",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete an API key",
  description:
    "Delete an API key for the authenticated organization. The key is revoked immediately.",
  parameters: [keyIdPathSchema],
  responses: {
    "204": {
      description: "The API key was deleted",
    },
    ...openApiErrorResponses,
  },
  tags: ["API Keys"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
await agentset.apiKeys.delete("cm4x1q2z90000abcd1234efgh");
console.log("API key deleted");
`,
    { isNs: false },
  ),
};
