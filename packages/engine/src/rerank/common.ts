import { VectorStoreResult } from "../vector-store/common/vector-store";

export interface RerankOptions {
  limit: number;
  query: string;
}

export abstract class Reranker {
  abstract doRerank<T extends VectorStoreResult>(
    results: T[],
    options: RerankOptions,
  ): Promise<{ index: number; rerankScore?: number }[]>;
}
