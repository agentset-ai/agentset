import posthog from "posthog-js";

export const logEvent = (event: string, properties?: Record<string, any>) => {
  posthog.capture(event, properties);
};
