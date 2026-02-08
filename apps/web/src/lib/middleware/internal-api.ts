import type { NextRequest } from "next/server";
import { env } from "@/env";

export const INTERNAL_MIDDLEWARE_SECRET_HEADER = "x-agentset-middleware-secret";

export const getInternalMiddlewareHeaders = (req: NextRequest) => ({
  "Content-Type": "application/json",
  cookie: req.headers.get("cookie") ?? "",
  [INTERNAL_MIDDLEWARE_SECRET_HEADER]: env.BETTER_AUTH_SECRET,
});

export const getInternalMiddlewareUrl = (req: NextRequest, path: string) =>
  `${req.nextUrl.origin}${path}`;
