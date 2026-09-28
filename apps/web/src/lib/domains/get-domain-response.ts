import type { DomainResponse } from "@/types/vercel";
import { env } from "@/env";

import { callVercelApi } from "./utils";

export const getDomainResponse = async (domain: string) => {
  return callVercelApi<
    DomainResponse & { error?: { code: string; message: string } }
  >(
    `/v9/projects/${env.VERCEL_PROJECT_ID}/domains/${domain.toLowerCase()}`,
    "GET",
  );
};

// the project domains endpoint only returns domains added to this project
export const isDomainOnProject = async (domain: string) => {
  const response = await getDomainResponse(domain);
  return !response.error && response.name === domain.toLowerCase();
};
