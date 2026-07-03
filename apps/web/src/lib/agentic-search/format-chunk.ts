import type { JSONValue } from "ai";

import type { VectorStoreResult } from "@agentset/engine";

/**
 * The shape of a search/expand tool result chunk. This is what the UI renders
 * (tool part output); `formatChunkForModel` projects it for the model.
 */
export type FormattedChunk = {
  /** vector store row id: `${documentId}#${chunkId}` */
  id: string;
  documentId: string;
  /** position of the chunk within its document (used by the expand tool) */
  sequence_number?: number;
  page_number?: number;
  filename?: string;
  text: string;
  /** user-provided document/ingest metadata */
  metadata?: Record<string, unknown>;
  score?: number;
  rerankScore?: number;
};

// internal attributes that shouldn't be surfaced as user metadata
const INTERNAL_METADATA_KEYS = new Set([
  "documentId",
  "namespaceId",
  "tenantId",
  "sequence_number",
  "page_number",
  "filename",
  // legacy llamaindex attributes
  "_node_content",
  "_node_type",
  "document_id",
  "doc_id",
  "ref_doc_id",
]);

export const formatChunk = (result: VectorStoreResult): FormattedChunk => {
  const metadata = result.metadata ?? {};
  const { documentId, sequence_number, page_number, filename } = metadata;

  const userMetadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!INTERNAL_METADATA_KEYS.has(key)) userMetadata[key] = value;
  }

  return {
    id: result.id,
    documentId:
      typeof documentId === "string" && documentId.length > 0
        ? documentId
        : result.id.split("#")[0]!,
    ...(typeof sequence_number === "number" && { sequence_number }),
    ...(typeof page_number === "number" && { page_number }),
    ...(typeof filename === "string" && { filename }),
    text: result.text,
    ...(Object.keys(userMetadata).length > 0 && { metadata: userMetadata }),
    ...(typeof result.score === "number" && { score: result.score }),
    ...(typeof result.rerankScore === "number" && {
      rerankScore: result.rerankScore,
    }),
  };
};

/**
 * Projection of a chunk sent to the model. Every field the `expand` tool
 * expects as input (`documentId`, `sequence_number`) must appear here with the
 * exact same spelling so the model can copy them verbatim. Ranking scores are
 * omitted as noise.
 */
export const formatChunkForModel = (chunk: FormattedChunk): JSONValue => ({
  id: chunk.id,
  documentId: chunk.documentId,
  ...(chunk.sequence_number !== undefined && {
    sequence_number: chunk.sequence_number,
  }),
  ...(chunk.page_number !== undefined && { page_number: chunk.page_number }),
  ...(chunk.filename && { filename: chunk.filename }),
  text: chunk.text,
  // metadata values come from the vector store and are JSON-safe
  ...(chunk.metadata &&
    Object.keys(chunk.metadata).length > 0 && {
      metadata: chunk.metadata as JSONValue,
    }),
});
