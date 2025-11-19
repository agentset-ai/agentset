import type { NextRequest } from "next/server";

import type { Hosting } from "@agentset/db";
import { db } from "@agentset/db/client";

import { auth } from "../auth";
import { AgentsetApiError } from "./errors";

export const hostingAuth = async (
  req: NextRequest,
  hosting: Pick<
    Hosting,
    "protected" | "allowedEmails" | "allowedEmailDomains"
  > & { namespace: { id: string } },
) => {
  if (!hosting.protected) return true;

  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    throw new AgentsetApiError({
      code: "unauthorized",
      message: "Unauthorized",
    });
  }

  const email = session.user.email;
  const emailDomain = email.split("@")[1] ?? "";
  const allowedEmailDomains = hosting.allowedEmailDomains;
  const allowedEmails = hosting.allowedEmails;

  if (allowedEmails.includes(email)) return true;
  if (allowedEmailDomains.includes(emailDomain)) return true;

  // check if they're members
  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organization: {
        namespaces: {
          some: {
            id: hosting.namespace.id,
          },
        },
      },
    },
  });

  if (member) return true;

  throw new AgentsetApiError({
    code: "unauthorized",
    message: "Unauthorized",
  });
};
