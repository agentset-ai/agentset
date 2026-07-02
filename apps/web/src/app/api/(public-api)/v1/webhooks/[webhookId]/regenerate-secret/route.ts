import { AgentsetApiError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { WebhookSchema } from "@/schemas/api/webhook";
import { regenerateWebhookSecret } from "@/services/webhooks/regenerate-secret";

import { prefixId } from "@agentset/utils";

export const POST = withApiHandler(
  async ({ organization, params, headers }) => {
    const webhook = await regenerateWebhookSecret({
      organizationId: organization.id,
      webhookId: params.webhookId ?? "",
    });

    if (!webhook) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Webhook not found.",
      });
    }

    return makeApiSuccessResponse({
      data: WebhookSchema.parse({
        ...webhook,
        namespaceIds: (webhook.namespaceIds ?? []).map((id) =>
          prefixId(id, "ns_"),
        ),
      }),
      headers,
    });
  },
  {
    logging: {
      routeName: "POST /v1/webhooks/[webhookId]/regenerate-secret",
    },
  },
);
