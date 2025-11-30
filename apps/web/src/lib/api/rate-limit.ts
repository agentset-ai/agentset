import { env } from "@/env";
import { Ratelimit } from "@upstash/ratelimit";

import { redis } from "../redis";

// Create a new ratelimiter, that allows 10 requests per 10 seconds by default
export const ratelimit = (
  requests: number = 10,
  seconds:
    | `${number} ms`
    | `${number} s`
    | `${number} m`
    | `${number} h`
    | `${number} d` = "10 s",
) => {
  if (env.NODE_ENV === "development") {
    return {
      limit: () => ({
        success: true,
        limit: requests,
        reset: Date.now() + seconds,
        remaining: requests,
      }),
    };
  }
  return new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(requests, seconds),
    analytics: true,
    prefix: "agentset",
  });
};
