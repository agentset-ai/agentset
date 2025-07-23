import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parse } from "@/lib/middleware/utils";

import { HOSTING_PREFIX } from "../constants";
import { getMiddlewareSession } from "./get-session";
import HostingMiddleware from "./hosting";

export default async function AppMiddleware(req: NextRequest) {
  const { path, fullPath } = parse(req);

  if (path.startsWith(HOSTING_PREFIX)) {
    return HostingMiddleware(req, "path");
  }

  const session = await getMiddlewareSession(req);

  // if the user is logged in, and is trying to access the login page, redirect to dashboard
  if (session && path.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // if the user is not logged in, and is trying to access a dashboard page, redirect to login
  if (
    !session &&
    !(path.startsWith("/login") || path.startsWith("/invitation"))
  ) {
    return NextResponse.redirect(new URL("/login", req.url), {
      headers: {
        "Set-Cookie": "",
      },
    });
  }

  // otherwise, rewrite the path to /app
  return NextResponse.rewrite(new URL(`/app.agentset.ai${fullPath}`, req.url));
}
