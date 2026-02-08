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
  const namespaceId = searchParams.get("namespaceId");

  if (!userId || !namespaceId) {
    return NextResponse.json(
      { message: "userId and namespaceId are required" },
      { status: 400 },
    );
  }

  const member = await db.member.findFirst({
    where: {
      userId,
      organization: {
        namespaces: {
          some: {
            id: namespaceId,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  return NextResponse.json({
    isMember: !!member,
  });
};
