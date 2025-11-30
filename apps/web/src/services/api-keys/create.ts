/**
 * Create API key
 *
 * Creates a new API key for an organization (admin/owner only).
 */

import { revalidateTag } from "next/cache";
import { AgentsetApiError } from "@/lib/api/errors";

import type { ProtectedAgentsetContext } from "../shared/context";

const keyGenerator = (prefix?: string, length = 16) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let apiKey = `${prefix || ""}`;
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    apiKey += characters[randomIndex];
  }

  return apiKey;
};

export const createApiKey = async (
  context: ProtectedAgentsetContext,
  input: {
    orgId: string;
    label: string;
    scope: "all";
  },
) => {
  const member = await context.db.member.findFirst({
    where: {
      userId: context.session.user.id,
      organizationId: input.orgId,
    },
  });

  if (!member || (member.role !== "admin" && member.role !== "owner")) {
    throw new AgentsetApiError({
      code: "unauthorized",
      message: "You must be an admin or owner to create API keys",
    });
  }

  const apiKey = await context.db.organizationApiKey.create({
    data: {
      label: input.label,
      scope: input.scope,
      organizationId: input.orgId,
      key: keyGenerator("agentset_"),
    },
  });

  revalidateTag(`apiKey:${apiKey.key}`);

  return apiKey;
};
