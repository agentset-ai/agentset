import { env } from "@/env";

import { db } from "@agentset/db/client";

import type { AgentsetApiError } from "../api/errors";
import {
  ccTLDs,
  SECOND_LEVEL_DOMAINS,
  SPECIAL_APEX_DOMAINS,
} from "./constants";

export const validDomainRegex = new RegExp(
  /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
);
export const isValidDomain = (domain: string) => {
  return validDomainRegex.test(domain);
  // return (
  //   validDomainRegex.test(domain) &&
  //   // make sure the domain isn't agentset.ai
  //   !/^(agentset\.ai|.*\.agentset\.ai)$/i.test(domain)
  // );
};

export const domainExists = async (domain: string) => {
  const response = await db.domain.findFirst({
    where: {
      slug: domain,
    },
    select: {
      slug: true,
    },
  });

  return !!response;
};

export const validateDomain = async (
  domain: string,
): Promise<
  { error: null } | { error: string; code: AgentsetApiError["code"] }
> => {
  if (!domain || typeof domain !== "string") {
    return { error: "Missing domain", code: "unprocessable_entity" };
  }

  if (!isValidDomain(domain)) {
    return { error: "Invalid domain", code: "unprocessable_entity" };
  }

  const exists = await domainExists(domain);
  if (exists) {
    return { error: "Domain is already in use.", code: "conflict" };
  }

  return { error: null };
};

export const getApexDomain = (url: string) => {
  let domain;
  try {
    // replace any custom scheme (e.g. notion://) with https://
    // use the URL constructor to get the hostname
    domain = new URL(url.replace(/^[a-zA-Z]+:\/\//, "https://")).hostname;
  } catch {
    return "";
  }
  if (domain === "youtu.be") return "youtube.com";

  const parts = domain.split(".");
  if (parts.length > 2) {
    if (
      // if this is a second-level TLD (e.g. co.uk, .com.ua, .org.tt), we need to return the last 3 parts
      (SECOND_LEVEL_DOMAINS.has(parts[parts.length - 2]!) &&
        ccTLDs.has(parts[parts.length - 1]!)) ||
      // if it's a special subdomain for website builders (e.g. weathergpt.vercel.app/)
      SPECIAL_APEX_DOMAINS.has(parts.slice(-2).join("."))
    ) {
      return parts.slice(-3).join(".");
    }
    // otherwise, it's a subdomain (e.g. agentset.vercel.app), so we return the last 2 parts
    return parts.slice(-2).join(".");
  }
  // if it's a normal domain (e.g. agentset.ai), we return the domain
  return domain;
};

export const callVercelApi = async <T>(
  path: string,
  method: "GET" | "POST" | "DELETE",
  body?: any,
) => {
  const url = new URL(`https://api.vercel.com${path}`);
  const searchParams = url.searchParams;
  searchParams.set("teamId", env.VERCEL_TEAM_ID);

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${env.VERCEL_API_TOKEN}`,
      ...(method !== "DELETE" && {
        "Content-Type": "application/json",
      }),
    },
    ...(!!body && {
      body: JSON.stringify(body),
    }),
  });

  return response.json() as Promise<T>;
};
