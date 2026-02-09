import { NextRequest, NextResponse } from "next/server";
import { isInternalMiddlewareRequest } from "@/lib/internal-api";

import { db } from "@agentset/db/client";

export const preferredRegion = "iad1";

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
      allowedEmailDomains: true,
      allowedEmails: true,
      namespaceId: true,
    },
  });

  return NextResponse.json({ hosting });
};
