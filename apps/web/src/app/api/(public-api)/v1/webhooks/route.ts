import { withApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import {
  createWebhookSchema,
  WebhookSchema,
  WebhookSummarySchema,
} from "@/schemas/api/webhook";
import { createWebhook } from "@/services/webhooks/create";
import { listWebhooks } from "@/services/webhooks/list";
import { requireWebhooksPlan } from "@/services/webhooks/plan";

import { normalizeId, prefixId } from "@agentset/utils";

export const GET = withApiHandler(
  async ({ organization, headers }) => {
    const webhooks = await listWebhooks({ organizationId: organization.id });

    return makeApiSuccessResponse({
      data: webhooks.map((webhook) =>
        WebhookSummarySchema.parse({
          ...webhook,
          namespaceIds: (webhook.namespaceIds ?? []).map((id) =>
            prefixId(id, "ns_"),
          ),
        }),
      ),
      headers,
    });
  },
  { logging: { routeName: "GET /v1/webhooks" } },
);

export const POST = withApiHandler(
  async ({ organization, req, headers }) => {
    requireWebhooksPlan(organization.plan);

    const parsed = await createWebhookSchema.parseAsync(
      await parseRequestBody(req),
    );

    const webhook = await createWebhook({
      ...parsed,
      namespaceIds: parsed.namespaceIds?.map((id) => normalizeId(id, "ns_")),
      organizationId: organization.id,
    });

    return makeApiSuccessResponse({
      data: WebhookSchema.parse({
        ...webhook,
        namespaceIds: (webhook.namespaceIds ?? []).map((id) =>
          prefixId(id, "ns_"),
        ),
      }),
      headers,
      status: 201,
    });
  },
  { logging: { routeName: "POST /v1/webhooks" } },
);
