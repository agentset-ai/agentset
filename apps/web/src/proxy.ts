import type { NextFetchEvent, NextRequest } from "next/server";

import { API_HOSTNAMES, APP_HOSTNAMES } from "./lib/constants";
import ApiMiddleware from "./lib/middleware/api";
import AppMiddleware from "./lib/middleware/app";
import HostingMiddleware from "./lib/middleware/hosting";
import { parse } from "./lib/middleware/utils";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api/ routes
     * 2. /_next/ (Next.js internals)
     * 3. /_proxy/ (proxies for third-party services)
     * 4. /icons/ (icons for the app)
     * 5. Metadata files: favicon.ico, sitemap.xml, robots.txt, manifest.webmanifest
     */
    "/((?!api/|_next/|_proxy/|icons/|favicon.ico|sitemap.xml|openapi.json|robots.txt|manifest.webmanifest).*)",
  ],
};

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { domain } = parse(request);

  // for App
  if (APP_HOSTNAMES.has(domain)) {
    return AppMiddleware(request, event);
  }

  // for API
  if (API_HOSTNAMES.has(domain)) {
    return ApiMiddleware(request);
  }

  // for Custom Domain
  return HostingMiddleware(request, event);
}
