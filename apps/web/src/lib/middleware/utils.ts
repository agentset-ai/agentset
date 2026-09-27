import type { NextRequest } from "next/server";

import { isEuRegion } from "@agentset/utils";

import { APP_HOSTNAME, SHORT_DOMAIN } from "../constants";

// import { SHORT_DOMAIN } from "@/lib/constants";

export const parse = (req: NextRequest) => {
  let domain = req.headers.get("host") as string;
  // path is the path of the URL (e.g. agentset.ai/stats/github -> /stats/github)
  const path = req.nextUrl.pathname;

  // remove www. from domain and convert to lowercase
  domain = domain.replace(/^www./, "").toLowerCase();

  // if (domain === "agentset.localhost:8888" || domain.endsWith(".vercel.app")) {
  if (domain.endsWith(".vercel.app")) {
    // for local development and preview URLs
    domain = isEuRegion ? APP_HOSTNAME : SHORT_DOMAIN;
  }

  // fullPath is the full URL path (along with search params)
  const searchParams = req.nextUrl.searchParams.toString();
  const searchParamsObj = Object.fromEntries(req.nextUrl.searchParams);
  const searchParamsString = searchParams.length > 0 ? `?${searchParams}` : "";
  const fullPath = `${path}${searchParamsString}`;

  // Here, we are using decodeURIComponent to handle foreign languages like Hebrew
  const key = decodeURIComponent(path.split("/")[1]!); // key is the first part of the path (e.g. agentset.ai/stats/github -> stats)
  const fullKey = decodeURIComponent(path.slice(1)); // fullKey is the full path without the first slash (to account for multi-level subpaths, e.g. d.to/github/repo -> github/repo)

  return {
    domain,
    path,
    fullPath,
    key,
    fullKey,
    searchParamsObj,
    searchParamsString,
  };
};
