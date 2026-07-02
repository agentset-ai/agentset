import { withNamespaceApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import {
  checkSearchLimit,
  incrementOrganizationSearchUsage,
} from "@/lib/api/usage";
import { parseRequestBody } from "@/lib/api/utils";
import { generateChat, streamChat } from "@/lib/chat";
import { chatSchema } from "@/schemas/api/chat";
import { toModelMessages } from "@/services/chat";

export const preferredRegion = "iad1"; // make this closer to the DB
export const maxDuration = 120;

export const POST = withNamespaceApiHandler(
  async ({ req, namespace, tenantId, organization, headers }) => {
    // TODO: set hard limits to prevent abuse
    checkSearchLimit(organization);

    const body = await chatSchema.parseAsync(await parseRequestBody(req));

    const messages = toModelMessages(body.messages);

    const onUsageIncrement = (queries: number) => {
      incrementOrganizationSearchUsage(organization.id, queries);
    };

    if (body.stream) {
      return streamChat({
        namespace,
        tenantId,
        messages,
        options: body,
        headers,
        onUsageIncrement,
      });
    }

    const { text, sources } = await generateChat({
      namespace,
      tenantId,
      messages,
      options: body,
      onUsageIncrement,
    });

    return makeApiSuccessResponse({
      data: {
        message: { role: "assistant", content: text },
        sources,
      },
      headers,
    });
  },
  { logging: { routeName: "POST /v1/namespace/[namespaceId]/chat" } },
);
