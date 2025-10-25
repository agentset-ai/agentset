import type {
  NodeRelationship,
  RelatedNodeType,
} from "@llamaindex/core/schema";

import { PartitionBatch } from "../../partition";
import { VectorFilter } from "./filter";

export type VectorStoreMetadata = Record<
  string,
  string | number | boolean | string[]
>;

export interface VectorStoreQueryOptions<Filter = VectorFilter> {
  id?: string;
  topK: number;
  filter?: Filter;
  includeMetadata?: boolean;
  includeRelationships?: boolean;
  minScore?: number;
  mode:
    | {
        type: "semantic";
        vector: number[];
      }
    | {
        type: "keyword";
        text: string;
      }
    | {
        type: "hybrid";
        vector: number[];
        text: string;
      };
}

export interface VectorStoreUpsertOptions {
  chunks: {
    documentId: string;
    chunk: PartitionBatch[number];
    embedding: number[];
  }[];
}

export type VectorStoreResult = {
  id: string;
  text: string;
  metadata?: VectorStoreMetadata;
  relationships?: Partial<
    Record<NodeRelationship, RelatedNodeType<VectorStoreMetadata>>
  >;
  score?: number;
  rerankScore?: number;
};

export type VectorStoreQueryResponse = VectorStoreResult[];

export interface VectorStoreListOptions {
  prefix?: string;
  paginationToken?: string;
}

export interface VectorStoreListResponse {
  results: {
    id: string;
  }[];
  pagination: {
    nextCursor?: string;
  };
}

export abstract class VectorStore<Filter = VectorFilter> {
  abstract query(
    options: VectorStoreQueryOptions<Filter>,
  ): Promise<VectorStoreQueryResponse>;
  abstract upsert(options: VectorStoreUpsertOptions): Promise<void>;

  abstract deleteByIds(
    idOrIds: string | string[],
  ): Promise<{ deleted?: number }>;
  abstract deleteByFilter(filter: Filter): Promise<{ deleted?: number }>;
  abstract deleteNamespace(): Promise<{ deleted?: number }>;

  abstract getDimensions(): Promise<number | "ANY">;

  abstract warmCache(): Promise<"UNSUPPORTED" | void>;

  abstract supportsKeyword(): boolean;
}
