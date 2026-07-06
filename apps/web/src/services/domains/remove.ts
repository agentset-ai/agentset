import { AgentsetApiError } from "@/lib/api/errors";
import { removeDomainFromVercel } from "@/lib/domains/remove-domain";
import { getCache } from "@vercel/functions";

import { db } from "@agentset/db/client";

import { assertVercelConfigured } from "./utils";

export const removeDomain = async ({ hostingId }: { hostingId: string }) => {
  const domain = await db.domain.findUnique({
    where: {
      hostingId,
    },
  });

  if (!domain) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Domain not found",
    });
  }

  assertVercelConfigured();

  const vercelResponse = await removeDomainFromVercel(domain.slug);
  // ignore not_found error
  if (vercelResponse.error && vercelResponse.error.code !== "not_found") {
    throw new AgentsetApiError({
      code: "unprocessable_entity",
      message: vercelResponse.error.message,
    });
  }

  const deletedDomain = await db.domain.delete({
    where: {
      id: domain.id,
    },
  });

  // Expire the middleware hosting cache so the removed domain stops resolving
  await getCache().expireTag(`hosting:${hostingId}`);

  return deletedDomain;
};
