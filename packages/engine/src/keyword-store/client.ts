import { AzureKeyCredential, SearchClient } from "@azure/search-documents";

import type { KeywordSearchChunk } from "./types";
import { env } from "../env";

export const getKeywordSearchClient = () => {
  if (
    !env.AZURE_SEARCH_URL ||
    !env.AZURE_SEARCH_INDEX ||
    !env.AZURE_SEARCH_KEY
  ) {
    throw new Error(
      "Azure Search is not configured. Please set AZURE_SEARCH_URL, AZURE_SEARCH_INDEX, and AZURE_SEARCH_KEY environment variables.",
    );
  }
  return new SearchClient<KeywordSearchChunk>(
    env.AZURE_SEARCH_URL,
    env.AZURE_SEARCH_INDEX,
    new AzureKeyCredential(env.AZURE_SEARCH_KEY),
  );
};
