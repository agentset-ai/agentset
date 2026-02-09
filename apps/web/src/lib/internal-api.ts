import { timingSafeEqual } from "crypto";
import { env } from "@/env";

import { INTERNAL_MIDDLEWARE_SECRET_HEADER } from "./middleware/internal-api";

export const isInternalMiddlewareRequest = (req: Request) => {
  const secret = env.BETTER_AUTH_SECRET;
  const header = req.headers.get(INTERNAL_MIDDLEWARE_SECRET_HEADER);

  // timingSafeEqual will throw an error if the lengths are different
  // so we need to check the lengths first
  if (!secret || !header || header.length !== secret.length) return false;

  const endcoder = new TextEncoder();
  return timingSafeEqual(endcoder.encode(secret), endcoder.encode(header));
};
