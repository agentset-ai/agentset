import { PartitionBatch } from "../partition";
import { VectorFilter } from "./filter";

export type VectorStoreMetadata = Record<
  string,
  string | number | boolean | string[]
>;

export interface VectorStoreQueryOptions<Filter = VectorFilter> {
  vector: number[];
  topK: number;
  filter?: Filter;
  includeMetadata?: boolean;
  id?: string;
}

export interface VectorStoreUpsertOptions {
  chunks: {
    documentId: string;
    chunk: PartitionBatch[number];
    embedding: number[];
  }[];
}

export type VectorStoreQueryResponse = {
  id: string;
  score?: number;
  metadata?: VectorStoreMetadata;
}[];

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
}
