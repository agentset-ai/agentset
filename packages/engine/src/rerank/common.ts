import type { BaseNode, Metadata } from "@llamaindex/core/schema";

export interface RerankOptions {
  limit: number;
  query: string;
}

export interface BaseRerankDocument {
  node: BaseNode<Metadata>;
}

export type RerankResult<T extends BaseRerankDocument> = T & {
  rerankScore?: number;
};

export abstract class BaseReranker {
  abstract rerank<T extends BaseRerankDocument>(
    results: T[],
    options: RerankOptions,
  ): Promise<RerankResult<T>[]>;
}
