import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAllowedHostingEmail } from "@/lib/hosting-access";
import { isInternalMiddlewareRequest } from "@/lib/internal-api";
import { isNamespaceMember } from "@/services/hosting/member";

import { db } from "@agentset/db/client";

// whether a signed-in user may open a protected hosting (used on EU, where
// the middleware cache doesn't hold the hosting's allowed emails)
export const GET = async (req: NextRequest) => {
  if (!isInternalMiddlewareRequest(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const hostingId = searchParams.get("hostingId");
  const userId = searchParams.get("userId");

  if (!hostingId || !userId) {
    return NextResponse.json(
      { message: "hostingId and userId are required" },
      { status: 400 },
    );
  }

  const [hosting, user] = await Promise.all([
    db.hosting.findUnique({
      where: { id: hostingId },
      select: {
        allowedEmailDomains: true,
        allowedEmails: true,
        namespaceId: true,
      },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    }),
  ]);

  if (!hosting || !user) {
    return NextResponse.json({ hasAccess: false });
  }

  if (isAllowedHostingEmail(hosting, user.email)) {
    return NextResponse.json({ hasAccess: true });
  }

  // members of the organization can always access its hostings
  return NextResponse.json({
    hasAccess: await isNamespaceMember({
      userId,
      namespaceId: hosting.namespaceId,
    }),
  });
};
