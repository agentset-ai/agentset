import { API_DOMAIN } from "@/lib/constants";

import { isEuRegion } from "@agentset/utils";

// the SDKs default to the US API, so EU snippets pass the EU API URL
export const API_URL = isEuRegion ? API_DOMAIN : "https://api.agentset.ai";

export const tsSdkApiUrlOption = isEuRegion
  ? `\n  baseUrl: "${API_DOMAIN}",`
  : "";

export const pythonSdkApiUrlOption = isEuRegion
  ? `\n    server_url="${API_DOMAIN}",`
  : "";
