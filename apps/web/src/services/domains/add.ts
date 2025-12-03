/**
 * Add domain to hosting
 *
 * Adds a domain to a namespace's hosting configuration.
 * Verifies domain format and adds it to Vercel.
 */

import { AgentsetApiError } from "@/lib/api/errors";
import { addDomainToVercel } from "@/lib/domains/add-domain";
import { validateDomain } from "@/lib/domains/utils";

import type { ProtectedAgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export const addDomain = async (
  context: ProtectedAgentsetContext,
  input: { namespaceId: string; domain: string },
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

  // get domain from hosting
  const domain = await context.db.domain.findUnique({
    where: {
      hostingId: hosting.id,
    },
  });

  if (domain) {
    throw new AgentsetApiError({
      code: "conflict",
      message: "You already set a domain",
    });
  }

  const validDomain = await validateDomain(input.domain);

  if (validDomain.error) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: validDomain.error,
    });
  }

  const vercelResponse = await addDomainToVercel(input.domain);
  if (
    vercelResponse.error &&
    vercelResponse.error.code !== "domain_already_in_use" // ignore this error
  ) {
    throw new AgentsetApiError({
      code: "unprocessable_entity",
      message: vercelResponse.error.message,
    });
  }

  return context.db.domain.create({
    data: {
      hostingId: hosting.id,
      slug: input.domain,
    },
  });
};
