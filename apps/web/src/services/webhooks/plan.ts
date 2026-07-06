import { AgentsetApiError } from "@/lib/api/errors";

import { isFreePlan } from "@agentset/stripe/plans";

// Webhooks are only available on the pro plan and above
export const requireWebhooksPlan = (plan: string) => {
  if (isFreePlan(plan)) {
    throw new AgentsetApiError({
      code: "forbidden",
      message:
        "Webhooks are only available on the Pro plan and above. Please upgrade to use this feature.",
    });
  }
};
