import { NextRequest, NextResponse } from "next/server";
import { isInternalMiddlewareRequest } from "@/lib/internal-api";

import { db } from "@agentset/db/client";

export const preferredRegion = "iad1";

export const GET = async (req: NextRequest) => {
  if (!isInternalMiddlewareRequest(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const activeOrganizationId = searchParams.get("activeOrganizationId");

  if (!userId) {
    return NextResponse.json(
      { message: "userId is required" },
      { status: 400 },
    );
  }

  const organization = await db.organization.findFirst({
    where: activeOrganizationId
      ? {
          id: activeOrganizationId,
        }
      : {
          members: {
            some: {
              userId,
            },
          },
        },
    select: {
      slug: true,
    },
  });

  return NextResponse.json({
    slug: organization?.slug ?? null,
  });
};
