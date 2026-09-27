import { env } from "./env";
import { loadPosthog } from "./lib/analytics";

const posthogKey = env.NEXT_PUBLIC_POSTHOG_KEY;

if (posthogKey) {
  void loadPosthog()?.then((posthog) => {
    posthog.init(posthogKey, {
      defaults: "2025-05-24",
      api_host: "/_proxy/posthog/ingest",
      ui_host: "https://us.posthog.com",
    });
  });
}
