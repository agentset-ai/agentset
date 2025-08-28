import posthog from "posthog-js";

type LogEventOptions = {
  sendInstantly?: boolean;
};

export const logEvent = (
  event: string,
  properties?: Record<string, any>,
  { sendInstantly }: LogEventOptions = {},
) => {
  posthog.capture(event, properties, { send_instantly: sendInstantly });
};
