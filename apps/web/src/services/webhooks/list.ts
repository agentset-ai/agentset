import { getWebhooks } from "@/lib/webhook/get-webhooks";
import { transformWebhook } from "@/lib/webhook/transform";

export const listWebhooks = async ({
  organizationId,
}: {
  organizationId: string;
}) => {
  const webhooks = await getWebhooks({ organizationId });

  return webhooks.map(transformWebhook);
};
