/**
 * Remove domain from hosting
 *
 * Removes a domain from a namespace's hosting configuration.
 */

import { AgentsetApiError } from "@/lib/api/errors";
import { removeDomainFromVercel } from "@/lib/domains/remove-domain";

import type { ProtectedAgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export const removeDomain = async (
  context: ProtectedAgentsetContext,
  input: { namespaceId: string },
) => {
  const namespace = await getNamespace(context, { id: input.namespaceId });

  const hosting = await context.db.hosting.findFirst({
    where: {
      namespaceId: namespace.id,
    },
  });

  if (!hosting) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Hosting not found",
    });
  }

  const domain = await context.db.domain.findUnique({
    where: {
      hostingId: hosting.id,
    },
  });

  if (!domain) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Domain not found",
    });
  }

  const vercelResponse = await removeDomainFromVercel(domain.slug);
  // ignore not_found error
  if (vercelResponse.error && vercelResponse.error.code !== "not_found") {
    throw new AgentsetApiError({
      code: "unprocessable_entity",
      message: vercelResponse.error.message,
    });
  }

  return context.db.domain.delete({
    where: {
      id: domain.id,
    },
  });
};
