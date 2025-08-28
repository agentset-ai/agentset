import posthog from "posthog-js";

import { env } from "./env";

if (env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    defaults: "2025-05-24",
    api_host: "/_proxy/posthog/ingest",
    ui_host: "https://us.posthog.com",
  });
}
