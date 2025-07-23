import StripeClient from "stripe";

import { env } from "./env";

// You don't need an API Key here, because the app uses the
// dashboard credentials to make requests.
export const stripe = new StripeClient(env.STRIPE_API_KEY, {
  // @ts-expect-error - Stripe only has the type of the latest version
  apiVersion: "2024-06-20",
  appInfo: {
    name: "Agentset.ai",
    version: "0.1.0",
  },
});
