import { VectorStore } from "./common/vector-store";

export interface ExpandChunkOptions {
  vectorStore: VectorStore;
  documentId: string;
  sequenceNumber: number;
  /**
   * Total number of surrounding chunks to fetch (half before, half after the
   * given chunk). The chunk itself is excluded.
   */
  limit?: number;
}

/**
 * Fetches the chunks surrounding a given chunk in its document, ordered by
 * their position. Check `vectorStore.supportsOrderedQuery()` before calling.
 */
export const expandChunk = async ({
  vectorStore,
  documentId,
  sequenceNumber,
  limit = 10,
}: ExpandChunkOptions) => {
  const half = Math.ceil(limit / 2);

  return vectorStore.queryOrdered({
    filter: {
      documentId,
      sequence_number: {
        $gte: sequenceNumber - half,
        $lte: sequenceNumber + half,
        $ne: sequenceNumber,
      },
    },
    orderBy: { attribute: "sequence_number", direction: "asc" },
    topK: limit,
    includeMetadata: true,
  });
};
