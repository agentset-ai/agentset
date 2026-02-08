import { timingSafeEqual } from "crypto";
import { env } from "@/env";

import { INTERNAL_MIDDLEWARE_SECRET_HEADER } from "./middleware/internal-api";

export const isInternalMiddlewareRequest = (req: Request) => {
  const secret = env.BETTER_AUTH_SECRET;

  if (!secret) return false;

  return timingSafeEqual(
    new TextEncoder().encode(secret),
    new TextEncoder().encode(
      req.headers.get(INTERNAL_MIDDLEWARE_SECRET_HEADER) ?? "",
    ),
  );
};
