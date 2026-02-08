import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parse } from "@/lib/middleware/utils";
import { getSessionCookie } from "better-auth/cookies";

import { HOSTING_PREFIX } from "../constants";
import { getMiddlewareSession } from "./get-session";
import {
  getInternalMiddlewareHeaders,
  getInternalMiddlewareUrl,
} from "./internal-api";
import HostingMiddleware from "./hosting";

const getDefaultOrganizationSlug = async (
  req: NextRequest,
  filter: {
    userId: string;
    activeOrganizationId: string | null;
  },
) => {
  const searchParams = new URLSearchParams({
    userId: filter.userId,
  });

  if (filter.activeOrganizationId) {
    searchParams.set("activeOrganizationId", filter.activeOrganizationId);
  }

  const response = await fetch(
    getInternalMiddlewareUrl(
      req,
      `/api/middleware/default-org?${searchParams.toString()}`,
    ),
    {
      headers: getInternalMiddlewareHeaders(req),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  try {
    const data = (await response.json()) as { slug: string | null };
    return data.slug;
  } catch {
    return null;
  }
};

export default async function AppMiddleware(
  req: NextRequest,
  event: NextFetchEvent,
) {
  const { path, fullPath } = parse(req);

  if (path.startsWith(HOSTING_PREFIX)) {
    return HostingMiddleware(req, event, "path");
  }

  const sessionCookie = getSessionCookie(req);

  // if the user is not logged in, and is trying to access a dashboard page, redirect to login
  if (
    !sessionCookie &&
    !(path.startsWith("/login") || path.startsWith("/invitation"))
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (sessionCookie) {
    // if the user is logged in, and is trying to access the login page, redirect to dashboard
    if (path.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // redirect to the default org
    if (path === "/") {
      const session = await getMiddlewareSession(req);
      if (!session) {
        return NextResponse.redirect(new URL("/login", req.url));
      }

      const orgSlug = await getDefaultOrganizationSlug(req, {
        userId: session.user.id,
        activeOrganizationId: session.session.activeOrganizationId ?? null,
      });

      if (orgSlug) return NextResponse.redirect(new URL(`/${orgSlug}`, req.url));
      return NextResponse.redirect(new URL("/create-organization", req.url));
    }
  }

  // otherwise, rewrite the path to /app
  return NextResponse.rewrite(new URL(`/app.agentset.ai${fullPath}`, req.url));
}
