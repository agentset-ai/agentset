import { wait } from "@trigger.dev/sdk";
import { Ratelimit, RatelimitConfig } from "@upstash/ratelimit";

import { redis } from "./redis";

export async function rateLimit(
  key: {
    queue: string;
    concurrencyKey: string;
  },
  limiter: RatelimitConfig["limiter"],
) {
  const rateLimiter = new Ratelimit({
    redis: redis,
    limiter,
    prefix: `jobs-ratelimit:${key.queue}`,
  });

  let res: Awaited<ReturnType<typeof rateLimiter.limit>>;
  while (true) {
    res = await rateLimiter.limit(key.concurrencyKey);
    if (res.success) break;
    if (res.reset === 0) throw new Error("This should not happen");

    if (res.reset > Date.now()) {
      await wait.until({ date: new Date(res.reset) });
    } else {
      await wait.for({ seconds: 2 });
    }
  }

  return true;
}
