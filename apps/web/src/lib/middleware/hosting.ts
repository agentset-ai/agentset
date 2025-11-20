import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parse } from "@/lib/middleware/utils";
import { getCache } from "@vercel/functions";
import { getSessionCookie } from "better-auth/cookies";

import type { Prisma } from "@agentset/db";
import { db } from "@agentset/db/edge";

import { HOSTING_PREFIX } from "../constants";
import { getMiddlewareSession } from "./get-session";

const getHosting = async (where: Prisma.HostingWhereInput) => {
  return db.hosting.findFirst({
    where,
    select: {
      id: true,
      slug: true,
      protected: true,
      allowedEmailDomains: true,
      allowedEmails: true,
      namespaceId: true,
    },
  });
};

type Hosting = Awaited<ReturnType<typeof getHosting>>;

const getCachedHosting = async (
  filter: { key: string; where: Prisma.HostingWhereInput },
  event: NextFetchEvent,
) => {
  let hosting: Hosting = null;
  const cache = getCache();
  const cachedHosting = await cache.get(filter.key);

  if (cachedHosting) return cachedHosting as unknown as Hosting;

  hosting = await getHosting(filter.where);

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

  let filter: { key: string; where: Prisma.HostingWhereInput };
  let fullPath = _fullPath;
  if (mode === "domain") {
    filter = {
      key: `domain:${domain}`,
      where: {
        domain: {
          slug: domain,
        },
      },
    };
  } else {
    // fullPath will looks like this: /a/my-slug/...
    // we need to get the slug and the rest of the path
    const slug = path.replace(HOSTING_PREFIX, "").split("/")[0];
    fullPath = fullPath.replace(`${HOSTING_PREFIX}${slug}`, "");
    if (fullPath === "") fullPath = "/";

    filter = {
      key: `slug:${slug}`,
      where: {
        slug,
      },
    };
  }

  const hosting = await getCachedHosting(filter, event);

  // 404
  if (!hosting) {
    return NextResponse.error();
  }

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
      const member = await db.member.findFirst({
        where: {
          userId: session.user.id,
          organization: {
            namespaces: {
              some: {
                id: hosting.namespaceId,
              },
            },
          },
        },
        select: {
          id: true,
        },
      });

      // if they're not a member, rewrite to not-allowed
      if (!member) {
        return NextResponse.rewrite(
          new URL(`/${hosting.id}/not-allowed`, req.url),
        );
      }
    }
  }

  // rewrite to the custom domain
  return NextResponse.rewrite(new URL(`/${hosting.id}${fullPath}`, req.url));
}
