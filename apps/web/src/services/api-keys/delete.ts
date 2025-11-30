/**
 * Delete API key
 *
 * Deletes an API key (admin/owner only).
 */

import { revalidateTag } from "next/cache";
import { AgentsetApiError } from "@/lib/api/errors";

import type { ProtectedAgentsetContext } from "../shared/context";

export const deleteApiKey = async (
  context: ProtectedAgentsetContext,
  input: { orgId: string; id: string },
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
      message: "You must be an admin or owner to delete API keys",
    });
  }

  const apiKey = await context.db.organizationApiKey.delete({
    where: {
      id: input.id,
    },
  });

  revalidateTag(`apiKey:${apiKey.key}`);

  return { success: true };
};
