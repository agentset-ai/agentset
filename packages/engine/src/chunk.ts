import { TextNode } from "@llamaindex/core/schema";
import { metadataDictToNode } from "@llamaindex/core/vector-store";

import type { PartitionBatch } from "./partition";
import { VectorStoreMetadata } from "./vector-store/common/vector-store";

export const makeChunk = (
  {
    documentId,
    embedding,
    chunk,
  }: {
    documentId: string;
    embedding: number[];
    chunk: PartitionBatch[number];
  },
  { removeTextFromMetadata = false }: { removeTextFromMetadata?: boolean } = {},
) => {
  return {
    id: `${documentId}#${chunk.id}`,
    vector: embedding,
    text: chunk.text,
    metadata: removeTextFromMetadata
      ? chunk.metadata
      : {
          ...chunk.metadata,
          text: chunk.text,
        },
  };
};

export const metadataToChunk = (metadata?: VectorStoreMetadata) => {
  if (!metadata || !metadata.text || !metadata.id) return null;

  const nodeContent = metadata?._node_content;
  if (!nodeContent) {
    const { text, id, ...rest } = metadata;
    return new TextNode({
      text: text as string,
      id_: id as string,
      metadata: rest,
    });
  }

  try {
    const node = metadataDictToNode(metadata);
    return node;
  } catch {
    return null;
  }
};

export type Chunk = ReturnType<typeof makeChunk>;
