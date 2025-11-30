/**
 * Check domain verification status
 *
 * Checks the verification status of a domain and updates it in the database.
 */

import { AgentsetApiError } from "@/lib/api/errors";
import { getConfigResponse } from "@/lib/domains/get-config-response";
import { getDomainResponse } from "@/lib/domains/get-domain-response";
import { verifyDomain } from "@/lib/domains/verify-domain";

import type { Domain } from "@agentset/db";

import type { ProtectedAgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export type DomainVerificationStatusProps =
  | "Valid Configuration"
  | "Invalid Configuration"
  | "Conflicting DNS Records"
  | "Pending Verification"
  | "Domain Not Found"
  | "Unknown Error";

export const checkDomainStatus = async (
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

  let status: DomainVerificationStatusProps = "Valid Configuration";

  const [domainJson, configJson] = await Promise.all([
    getDomainResponse(domain.slug),
    getConfigResponse(domain.slug),
  ]);

  if (domainJson.error?.code === "not_found") {
    // domain not found on Vercel project
    status = "Domain Not Found";
    return {
      status,
      response: { configJson, domainJson },
    };
  } else if (domainJson.error) {
    status = "Unknown Error";
    return {
      status,
      response: { configJson, domainJson },
    };
  }

  /**
   * Domain has DNS conflicts
   */
  if (configJson.conflicts && configJson.conflicts.length > 0) {
    status = "Conflicting DNS Records";
    return {
      status,
      response: { configJson, domainJson },
    };
  }

  /**
   * If domain is not verified, we try to verify now
   */
  if (!domainJson.verified) {
    status = "Pending Verification";
    const verificationJson = await verifyDomain(domain.slug);
    if (verificationJson.verified) {
      /**
       * Domain was just verified
       */
      status = "Valid Configuration";
    }

    return {
      status,
      response: { configJson, domainJson, verificationJson },
    };
  }

  let prismaResponse: Domain | null = null;
  if (!configJson.misconfigured) {
    prismaResponse = await context.db.domain.update({
      where: {
        id: domain.id,
      },
      data: {
        verified: true,
        lastChecked: new Date(),
      },
    });
  } else {
    status = "Invalid Configuration";
    prismaResponse = await context.db.domain.update({
      where: {
        id: domain.id,
      },
      data: {
        verified: false,
        lastChecked: new Date(),
      },
    });
  }

  return {
    status,
    response: { configJson, domainJson, prismaResponse },
  };
};
