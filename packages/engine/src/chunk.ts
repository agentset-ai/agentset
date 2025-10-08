import { jsonToNode, ObjectType } from "@llamaindex/core/schema";
import {
  metadataDictToNode,
  nodeToMetadata,
} from "@llamaindex/core/vector-store";

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
  const node = chunkResultToLlamaIndex(chunk);

  return {
    id: `${documentId}#${chunk.id_}`,
    vector: embedding,
    text: chunk.text,
    metadata: nodeToMetadata(node, removeTextFromMetadata),
  };
};

export const metadataToChunk = (metadata?: VectorStoreMetadata) => {
  const nodeContent = metadata?._node_content;
  if (!nodeContent) return null;

  try {
    const node = metadataDictToNode(metadata);
    return node;
  } catch {
    return null;
  }
};

export type Chunk = ReturnType<typeof makeChunk>;

const objectTypeMap = {
  "1": ObjectType.TEXT,
  "2": ObjectType.IMAGE,
  "3": ObjectType.INDEX,
  "4": ObjectType.DOCUMENT,
  "5": ObjectType.IMAGE_DOCUMENT,
};

const nodeClassNameMap = {
  TextNode: ObjectType.TEXT,
  ImageNode: ObjectType.IMAGE,
  IndexNode: ObjectType.INDEX,
  Document: ObjectType.DOCUMENT,
  MultimodalNode: ObjectType.IMAGE_DOCUMENT,
};

const nodeRelationshipMap = {
  "1": "SOURCE",
  "2": "PREVIOUS",
  "3": "NEXT",
  "4": "PARENT",
  "5": "CHILD",
};

// const modalityMap = {
//   "1": "TEXT",
//   "2": "IMAGE",
//   "3": "AUDIO",
//   "4": "VIDEO",
// };

// const metadataModeMap = {
//   all: MetadataMode.ALL,
//   embed: MetadataMode.EMBED,
//   llm: MetadataMode.LLM,
//   none: MetadataMode.NONE,
// };

const chunkResultToLlamaIndex = (chunk: PartitionBatch[number]) => {
  const newChunk = {
    ...chunk,
    type: nodeClassNameMap[chunk.class_name as keyof typeof nodeClassNameMap],
    relationships: Object.keys(chunk.relationships).reduce(
      (acc, key) => {
        const relationship = chunk.relationships[key]!;

        const newKey =
          nodeRelationshipMap[key as keyof typeof nodeRelationshipMap];
        const type =
          objectTypeMap[relationship.node_type as keyof typeof objectTypeMap];

        acc[newKey] = {
          nodeId: relationship.node_id,
          type,
          metadata: relationship.metadata,
          hash: relationship.hash,
        };

        return acc;
      },
      {} as Record<string, any>,
    ),
    endCharIdx: chunk.end_char_idx,
    startCharIdx: chunk.start_char_idx,
    metadata: chunk.metadata,
    metadataSeparator: chunk.metadata_separator,
    metadataTemplate: chunk.metadata_template,
    text: chunk.text,
    textTemplate: chunk.text_template,
    mimetype: chunk.mimetype,
    excludedEmbedMetadataKeys: chunk.excluded_embed_metadata_keys,
    excludedLlmMetadataKeys: chunk.excluded_llm_metadata_keys,
  };

  const node = jsonToNode(newChunk);

  return node;
};
