import { withApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import {
  ApiKeySchema,
  createApiKeyBodySchema,
  CreatedApiKeySchema,
} from "@/schemas/api/api-key";
import { createApiKey } from "@/services/api-key/create";
import { listApiKeys } from "@/services/api-key/list";

import { prefixId } from "@agentset/utils";

export const GET = withApiHandler(
  async ({ organization, headers }) => {
    const apiKeys = await listApiKeys({ organizationId: organization.id });

    return makeApiSuccessResponse({
      data: apiKeys.map((apiKey) =>
        ApiKeySchema.parse({
          ...apiKey,
          organizationId: prefixId(apiKey.organizationId, "org_"),
        }),
      ),
      headers,
    });
  },
  { logging: { routeName: "GET /v1/api-keys" } },
);

export const POST = withApiHandler(
  async ({ organization, headers, req }) => {
    const { label, scope } = await createApiKeyBodySchema.parseAsync(
      await parseRequestBody(req),
    );

    // TODO: check apiScope
    const apiKey = await createApiKey({
      organizationId: organization.id,
      label,
      scope,
    });

    return makeApiSuccessResponse({
      data: CreatedApiKeySchema.parse({
        ...apiKey,
        organizationId: prefixId(apiKey.organizationId, "org_"),
      }),
      headers,
      status: 201,
    });
  },
  { logging: { routeName: "POST /v1/api-keys" } },
);
