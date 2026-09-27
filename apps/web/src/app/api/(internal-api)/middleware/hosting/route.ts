import { NextRequest, NextResponse } from "next/server";
import { isInternalMiddlewareRequest } from "@/lib/internal-api";

import { db } from "@agentset/db/client";
import { isEuRegion } from "@agentset/utils";

const isHostingLookupMode = (
  mode: string | null,
): mode is "domain" | "slug" => {
  return mode === "domain" || mode === "slug";
};

export const GET = async (req: NextRequest) => {
  if (!isInternalMiddlewareRequest(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("mode");
  const value = searchParams.get("value");

  if (!isHostingLookupMode(mode) || !value) {
    return NextResponse.json(
      { message: "mode and value are required" },
      { status: 400 },
    );
  }

  const hosting = await db.hosting.findFirst({
    where:
      mode === "domain"
        ? {
            domain: {
              slug: value,
            },
          }
        : {
            slug: value,
          },
    select: {
      id: true,
      slug: true,
      protected: true,
      // on EU the middleware caches this response, so it gets routing fields
      // only and access is checked by the access route
      allowedEmailDomains: !isEuRegion,
      allowedEmails: !isEuRegion,
      namespaceId: true,
    },
  });

  return NextResponse.json({ hosting });
};
