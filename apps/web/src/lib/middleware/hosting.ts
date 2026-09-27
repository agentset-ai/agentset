import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parse } from "@/lib/middleware/utils";
import { getCache } from "@vercel/functions";
import { getSessionCookie } from "better-auth/cookies";

import { isEuRegion } from "@agentset/utils";

import type { Session } from "../auth-types";
import { HOSTING_PREFIX } from "../constants";
import { isAllowedHostingEmail } from "../hosting-access";
import { getMiddlewareSession } from "./get-session";
import {
  getInternalMiddlewareHeaders,
  getInternalMiddlewareUrl,
} from "./internal-api";

type Hosting = {
  id: string;
  slug: string;
  protected: boolean;
  allowedEmailDomains: string[];
  allowedEmails: string[];
  namespaceId: string;
};

// on EU the lookup returns (and the cache holds) routing fields only, and
// access checks run in the internal route
type HostingRoute = Pick<Hosting, "id" | "slug" | "protected" | "namespaceId">;

const toHostingRoute = (hosting: HostingRoute): HostingRoute => ({
  id: hosting.id,
  slug: hosting.slug,
  protected: hosting.protected,
  namespaceId: hosting.namespaceId,
});

type HostingFilter = { key: string; mode: "domain" | "slug"; value: string };

const getHosting = async (
  req: NextRequest,
  filter: Pick<HostingFilter, "mode" | "value">,
) => {
  const searchParams = new URLSearchParams({
    mode: filter.mode,
    value: filter.value,
  });

  const response = await fetch(
    getInternalMiddlewareUrl(req, `/api/middleware/hosting?${searchParams}`),
    {
      headers: getInternalMiddlewareHeaders(req),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  try {
    const data = (await response.json()) as { hosting: Hosting | null };
    return data.hosting;
  } catch {
    return null;
  }
};

const getIsHostingMember = async (
  req: NextRequest,
  filter: { userId: string; namespaceId: string },
) => {
  const searchParams = new URLSearchParams({
    userId: filter.userId,
    namespaceId: filter.namespaceId,
  });

  const response = await fetch(
    getInternalMiddlewareUrl(
      req,
      `/api/middleware/hosting/member?${searchParams.toString()}`,
    ),
    {
      headers: getInternalMiddlewareHeaders(req),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return false;
  }

  try {
    const data = (await response.json()) as { isMember: boolean };
    return data.isMember;
  } catch {
    return false;
  }
};

const getHasHostingAccess = async (
  req: NextRequest,
  filter: { hostingId: string; userId: string },
) => {
  const searchParams = new URLSearchParams({
    hostingId: filter.hostingId,
    userId: filter.userId,
  });

  const response = await fetch(
    getInternalMiddlewareUrl(
      req,
      `/api/middleware/hosting/access?${searchParams.toString()}`,
    ),
    {
      headers: getInternalMiddlewareHeaders(req),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return false;
  }

  try {
    const data = (await response.json()) as { hasAccess: boolean };
    return data.hasAccess;
  } catch {
    return false;
  }
};

const isAllowedHostingUser = async (
  req: NextRequest,
  hosting: Hosting | HostingRoute,
  session: Session,
) => {
  if (isEuRegion) {
    return getHasHostingAccess(req, {
      hostingId: hosting.id,
      userId: session.user.id,
    });
  }

  // if the user is not allowed to access this domain, check if they're a member in the organization as a last resort
  if (!isAllowedHostingEmail(hosting as Hosting, session.user.email)) {
    // check if they're members
    return getIsHostingMember(req, {
      userId: session.user.id,
      namespaceId: hosting.namespaceId,
    });
  }

  return true;
};

const getCachedHosting = async (
  filter: HostingFilter,
  event: NextFetchEvent,
  req: NextRequest,
) => {
  let hosting: Hosting | HostingRoute | null = null;
  const cache = getCache();
  const cachedHosting = await cache.get(filter.key);

  if (cachedHosting) return cachedHosting as unknown as Hosting | HostingRoute;

  hosting = await getHosting(req, filter);

  // cache the hosting in background
  if (hosting) {
    event.waitUntil(
      cache.set(filter.key, isEuRegion ? toHostingRoute(hosting) : hosting, {
        ttl: 3600, // 1 hour
        tags: [`hosting:${hosting.id}`],
      }),
    );
  }

  return hosting;
};

export default async function HostingMiddleware(
  req: NextRequest,
  event: NextFetchEvent,
  mode: "domain" | "path" = "domain",
) {
  const { domain, path, fullPath: _fullPath } = parse(req);

  let filter: HostingFilter;
  let fullPath = _fullPath;
  if (mode === "domain") {
    filter = {
      key: `domain:${domain}`,
      mode: "domain",
      value: domain,
    };
  } else {
    // fullPath will looks like this: /a/my-slug/...
    // we need to get the slug and the rest of the path
    const slug = path.replace(HOSTING_PREFIX, "").split("/")[0] ?? "";
    fullPath = fullPath.replace(`${HOSTING_PREFIX}${slug}`, "");
    if (fullPath === "") fullPath = "/";

    filter = {
      key: `slug:${slug}`,
      mode: "slug",
      value: slug,
    };
  }

  const hosting = await getCachedHosting(filter, event, req);

  // 404
  if (!hosting)
    return NextResponse.rewrite(new URL(`/hosting-not-found`, req.url));

  const sessionCookie = getSessionCookie(req);

  if (fullPath === "/login") {
    // if the domain is not protected, or there is a session cookie
    // AND the path is /login, redirect to /
    if (!hosting.protected || sessionCookie) {
      const homeUrl = new URL(
        mode === "domain" ? "/" : `${HOSTING_PREFIX}${hosting.slug}`,
        req.url,
      );
      return NextResponse.redirect(homeUrl);
    }

    // otherwise, rewrite to the login page
    return NextResponse.rewrite(new URL(`/${hosting.id}${fullPath}`, req.url));
  }

  if (hosting.protected) {
    const session = sessionCookie ? await getMiddlewareSession(req) : null;

    // if the hosting is protected and there is no session, redirect to login
    if (!session) {
      const loginUrl = new URL(
        `/login${mode === "path" ? `?r=${encodeURIComponent(`${HOSTING_PREFIX}${hosting.slug}`)}` : ""}`,
        req.url,
      );
      return NextResponse.redirect(loginUrl);
    }

    // if the user is not allowed to access this domain, rewrite to not-allowed
    if (!(await isAllowedHostingUser(req, hosting, session))) {
      return NextResponse.rewrite(
        new URL(`/${hosting.id}/not-allowed`, req.url),
      );
    }
  }

  // rewrite to the custom domain
  return NextResponse.rewrite(new URL(`/${hosting.id}${fullPath}`, req.url));
}
