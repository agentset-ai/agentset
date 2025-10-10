import { NextRequest } from "next/server";
import { makeAuth } from "@/lib/auth";
import { HOSTING_PREFIX } from "@/lib/constants";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler((_req) => {
  const req = _req as NextRequest;

  const host = req.headers.get("host");
  // check if host is localhost
  const isLocalhost =
    host?.startsWith("localhost:") || host?.includes(".localhost:");
  const baseUrl = isLocalhost ? `http://${host}` : `https://${host}`;

  const searchParams = req.nextUrl.searchParams;
  const callbackURL = searchParams.get("callbackURL");
  const isHosting = callbackURL?.startsWith(HOSTING_PREFIX) ?? false;

  return makeAuth({ baseUrl, isHosting }).handler(req);
});
