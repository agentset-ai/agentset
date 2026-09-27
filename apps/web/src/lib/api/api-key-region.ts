import { isEuRegion } from "@agentset/utils";

const US_API_KEY_PREFIX = "agentset_";
const EU_API_KEY_PREFIX = "agentset_eu_";

// EU keys carry their own prefix so either API can point callers to the
// region that issued the key
export const API_KEY_PREFIX = isEuRegion
  ? EU_API_KEY_PREFIX
  : US_API_KEY_PREFIX;

/**
 * Returns an error message when the key was issued by the other region's
 * API, or null when it may belong to this one.
 */
export const getApiKeyRegionError = (apiKey: string): string | null => {
  const isEuKey = apiKey.startsWith(EU_API_KEY_PREFIX);

  if (isEuRegion) {
    return !isEuKey && apiKey.startsWith(US_API_KEY_PREFIX)
      ? "This API key belongs to the US region; use https://api.agentset.ai"
      : null;
  }

  return isEuKey
    ? "This API key belongs to the EU region; use https://api.eu.agentset.ai"
    : null;
};
