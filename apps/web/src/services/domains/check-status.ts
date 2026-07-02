import type { DomainVerificationStatusProps } from "@/schemas/api/hosting";
import { AgentsetApiError } from "@/lib/api/errors";
import { getConfigResponse } from "@/lib/domains/get-config-response";
import { getDomainResponse } from "@/lib/domains/get-domain-response";
import { verifyDomain } from "@/lib/domains/verify-domain";

import type { Domain } from "@agentset/db";
import { db } from "@agentset/db/client";

import { assertVercelConfigured } from "./utils";

export const checkDomainStatus = async ({
  hostingId,
}: {
  hostingId: string;
}) => {
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
    prismaResponse = await db.domain.update({
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
    prismaResponse = await db.domain.update({
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
