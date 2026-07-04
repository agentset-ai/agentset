import { AgentsetApiError } from "@/lib/api/errors";
import {
  ApiKeySchema,
  createApiKeyBodySchema,
  CreatedApiKeySchema,
} from "@/schemas/api/api-key";
import { publicApi, successSchema } from "@/server/orpc/base";
import { createApiKey } from "@/services/api-key/create";
import { deleteApiKey } from "@/services/api-key/delete";
import { listApiKeys } from "@/services/api-key/list";
import { z } from "zod/v4";

import { prefixId } from "@agentset/utils";

import { makeCodeSamples, ts } from "./code-samples";

const keyIdPathSchema = z.string().meta({
  examples: ["cm4x1q2z90000abcd1234efgh"],
  description: "The id of the API key.",
  param: {
    in: "path",
    name: "keyId",
    id: "ApiKeyIdRef",
  },
});

const list = publicApi
  .route({
    method: "GET",
    path: "/api-keys",
    operationId: "listApiKeys",
    summary: "Retrieve a list of API keys",
    description:
      "Retrieve a list of API keys for the authenticated organization. The key material is never returned.",
    tags: ["API Keys"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "list",
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const apiKeys = await agentset.apiKeys.list();
console.log(apiKeys);
`,
        { isNs: false },
      ),
    }),
  })
  .output(successSchema(z.array(ApiKeySchema)))
  .handler(async ({ context }) => {
    const apiKeys = await listApiKeys({
      organizationId: context.organization.id,
    });

    return {
      success: true as const,
      data: apiKeys.map((apiKey) => ({
        ...apiKey,
        organizationId: prefixId(apiKey.organizationId, "org_"),
      })),
    };
  });

const create = publicApi
  .route({
    method: "POST",
    path: "/api-keys",
    successStatus: 201,
    operationId: "createApiKey",
    summary: "Create an API key",
    description:
      "Create an API key for the authenticated organization. The full key is only returned once, at creation time.",
    tags: ["API Keys"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "create",
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
    }),
  })
  .input(createApiKeyBodySchema)
  .output(successSchema(CreatedApiKeySchema))
  .handler(async ({ context, input }) => {
    // TODO: check apiScope
    const apiKey = await createApiKey({
      organizationId: context.organization.id,
      label: input.label,
      scope: input.scope,
    });

    return {
      success: true as const,
      data: {
        ...apiKey,
        organizationId: prefixId(apiKey.organizationId, "org_"),
      },
    };
  });

const remove = publicApi
  .route({
    method: "DELETE",
    path: "/api-keys/{keyId}",
    successStatus: 204,
    operationId: "deleteApiKey",
    summary: "Delete an API key",
    description:
      "Delete an API key for the authenticated organization. The key is revoked immediately.",
    tags: ["API Keys"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "delete",
      "x-speakeasy-max-method-params": 1,
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
await agentset.apiKeys.delete("cm4x1q2z90000abcd1234efgh");
console.log("API key deleted");
`,
        { isNs: false },
      ),
    }),
  })
  .input(z.object({ keyId: keyIdPathSchema }))
  .output(z.void())
  .handler(async ({ context, input }) => {
    const keyId = input.keyId;
    if (!keyId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid API key ID.",
      });
    }

    // scoped to the organization; a missing key throws P2025 which maps to a 404
    await deleteApiKey({ id: keyId, organizationId: context.organization.id });
  });

export const apiKeysRouter = {
  list,
  create,
  delete: remove,
};
