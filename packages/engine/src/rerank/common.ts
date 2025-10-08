import { VectorStoreResult } from "../vector-store/common/vector-store";

export interface RerankOptions {
  limit: number;
  query: string;
}

export type RerankResult<T extends VectorStoreResult> = T & {
  rerankScore?: number;
};

export abstract class Reranker {
  abstract rerank<T extends VectorStoreResult>(
    results: T[],
    options: RerankOptions,
  ): Promise<RerankResult<T>[]>;
}
