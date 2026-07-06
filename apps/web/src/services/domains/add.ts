import { AgentsetApiError } from "@/lib/api/errors";
import { addDomainToVercel } from "@/lib/domains/add-domain";
import { validateDomain } from "@/lib/domains/utils";

import { db } from "@agentset/db/client";

import { assertVercelConfigured } from "./utils";

export const addDomain = async ({
  hostingId,
  domain,
}: {
  hostingId: string;
  domain: string;
}) => {
  // get domain from hosting
  const existingDomain = await db.domain.findUnique({
    where: {
      hostingId,
    },
  });

  if (existingDomain) {
    throw new AgentsetApiError({
      code: "conflict",
      message: "You already set a domain",
    });
  }

  const validDomain = await validateDomain(domain);

  if (validDomain.error) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: validDomain.error,
    });
  }

  assertVercelConfigured();

  const vercelResponse = await addDomainToVercel(domain);
  if (
    vercelResponse.error &&
    vercelResponse.error.code !== "domain_already_in_use" // ignore this error
  ) {
    throw new AgentsetApiError({
      code: "unprocessable_entity",
      message: vercelResponse.error.message,
    });
  }

  return db.domain.create({
    data: {
      hostingId,
      slug: domain,
    },
  });
};
