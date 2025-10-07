import { Index, Pinecone as PineconeClient } from "@pinecone-database/pinecone";

import { makeChunk } from "../../chunk";
import {
  VectorStore,
  VectorStoreQueryOptions,
  VectorStoreQueryResponse,
  VectorStoreUpsertOptions,
} from "../vector-store";
import { PineconeFilterTranslator, PineconeVectorFilter } from "./filter";

export class Pinecone implements VectorStore<PineconeVectorFilter> {
  private readonly client: Index;
  private readonly filterTranslator = new PineconeFilterTranslator();

  constructor({
    apiKey,
    indexHost,
    namespace,
  }: {
    apiKey: string;
    indexHost: string;
    namespace: string;
  }) {
    this.client = new PineconeClient({ apiKey })
      .index("", indexHost)
      .namespace(namespace);
  }

  // async list(
  //   params: VectorStoreListOptions = {},
  // ): Promise<VectorStoreListResponse> {
  //   const data = await this.client.listPaginated(params);
  //   return {
  //     results: data.vectors?.map((vector) => ({ id: vector.id! })) ?? [],
  //     pagination: {
  //       nextCursor: data.pagination?.next,
  //     },
  //   };
  // }

  async query(
    params: VectorStoreQueryOptions<PineconeVectorFilter>,
  ): Promise<VectorStoreQueryResponse> {
    const translatedFilter = this.filterTranslator.translate(params.filter);

    const result = await this.client.query({
      id: params.id,
      topK: params.topK,
      filter: translatedFilter ?? undefined,
      vector: params.vector,
      includeMetadata: params.includeMetadata,
    });

    return result.matches.map((match) => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata ?? {},
    }));
  }

  async upsert({ chunks }: VectorStoreUpsertOptions) {
    const nodes = chunks.map((chunk) => makeChunk(chunk));

    return this.client.upsert(
      nodes.map((chunk) => ({
        id: chunk.id,
        values: chunk.vector,
        ...(chunk.metadata && { metadata: chunk.metadata }),
      })),
    );
  }

  async deleteByIds(idOrIds: string | string[]) {
    if (Array.isArray(idOrIds)) {
      await this.client.deleteMany(idOrIds);
      return { deleted: undefined };
    }

    await this.client.deleteOne(idOrIds);
    return { deleted: undefined };
  }

  async deleteByFilter(filter: PineconeVectorFilter) {
    const translatedFilter = this.filterTranslator.translate(filter);
    await this.client.deleteMany({
      filter: translatedFilter ?? undefined,
    });
    return { deleted: undefined };
  }

  async deleteNamespace() {
    await this.client.deleteAll();
    return { deleted: undefined };
  }

  async getDimensions() {
    const response = await this.client.describeIndexStats();
    return response.dimension!;
  }
}
