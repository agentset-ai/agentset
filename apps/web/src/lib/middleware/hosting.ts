import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parse } from "@/lib/middleware/utils";
import { getCache } from "@vercel/functions";
import { getSessionCookie } from "better-auth/cookies";

import { HOSTING_PREFIX } from "../constants";
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

const getCachedHosting = async (
  filter: HostingFilter,
  event: NextFetchEvent,
  req: NextRequest,
) => {
  let hosting: Hosting | null = null;
  const cache = getCache();
  const cachedHosting = await cache.get(filter.key);

  if (cachedHosting) return cachedHosting as unknown as Hosting;

  hosting = await getHosting(req, filter);

  // cache the hosting in background
  if (hosting) {
    event.waitUntil(
      cache.set(filter.key, hosting, {
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

    // check if the user is allowed to access this domain
    const email = session.user.email;
    const emailDomain = email.split("@")[1] ?? "";
    const allowedEmailDomains = hosting.allowedEmailDomains;
    const allowedEmails = hosting.allowedEmails;

    // if the user is not allowed to access this domain, check if they're a member in the organization as a last resort
    // if they're not a member, redirect to not-allowed
    if (
      !allowedEmails.includes(email) &&
      !allowedEmailDomains.includes(emailDomain)
    ) {
      // check if they're members
      const isMember = await getIsHostingMember(req, {
        userId: session.user.id,
        namespaceId: hosting.namespaceId,
      });

      // if they're not a member, rewrite to not-allowed
      if (!isMember) {
        return NextResponse.rewrite(
          new URL(`/${hosting.id}/not-allowed`, req.url),
        );
      }
    }
  }

  // rewrite to the custom domain
  return NextResponse.rewrite(new URL(`/${hosting.id}${fullPath}`, req.url));
}
