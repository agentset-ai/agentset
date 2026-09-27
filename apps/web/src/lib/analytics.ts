import type { PostHog } from "posthog-js";

import { REGION_FEATURES } from "@agentset/utils";

type LogEventOptions = {
  sendInstantly?: boolean;
};

let posthogPromise: Promise<PostHog> | undefined;

// posthog-js is only loaded in regions with product analytics. All callers
// share one promise, so calls run in order (init first, from
// instrumentation-client).
export const loadPosthog = () => {
  if (!REGION_FEATURES.productAnalytics) return;

  posthogPromise ??= import("posthog-js").then((mod) => mod.default);
  return posthogPromise;
};

export const logEvent = (
  event: string,
  properties?: Record<string, any>,
  { sendInstantly }: LogEventOptions = {},
) => {
  void loadPosthog()?.then((posthog) => {
    posthog.capture(event, properties, { send_instantly: sendInstantly });
  });
};
