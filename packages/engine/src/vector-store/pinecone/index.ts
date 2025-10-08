import { MetadataMode } from "@llamaindex/core/schema";
import { Index, Pinecone as PineconeClient } from "@pinecone-database/pinecone";

import { filterFalsy } from "@agentset/utils";

import { makeChunk, metadataToChunk } from "../../chunk";
import {
  VectorStore,
  VectorStoreQueryOptions,
  VectorStoreQueryResponse,
  VectorStoreUpsertOptions,
} from "../common/vector-store";
import { PineconeFilterTranslator, PineconeVectorFilter } from "./filter";

export class Pinecone implements VectorStore<PineconeVectorFilter> {
  private readonly client: Index;
  private readonly filterTranslator = new PineconeFilterTranslator();

  constructor({
    apiKey,
    indexHost,
    namespaceId,
    tenantId,
  }: {
    apiKey: string;
    indexHost: string;
    namespaceId: string;
    tenantId?: string;
  }) {
    const namespace = `agentset:${namespaceId}${tenantId ? `:${tenantId}` : ""}`;
    this.client = new PineconeClient({ apiKey })
      .index("", indexHost)
      .namespace(namespace);
  }

  async query(
    params: VectorStoreQueryOptions<PineconeVectorFilter>,
  ): Promise<VectorStoreQueryResponse> {
    const translatedFilter = this.filterTranslator.translate(params.filter);

    const result = await this.client.query({
      id: params.id,
      topK: params.topK,
      filter: translatedFilter ?? undefined,
      vector: params.vector,
      includeMetadata: true,
    });

    let results = result.matches;

    // Filter by minimum score if provided
    if (typeof params.minScore === "number") {
      results = results.filter(
        (match) =>
          typeof match.score === "number" && match.score >= params.minScore!,
      );
    }

    // Parse metadata to nodes
    return filterFalsy(
      results.map((match) => {
        const node = metadataToChunk(match.metadata);
        if (!node) return null;

        return {
          id: match.id,
          score: match.score,
          text: node.getContent(MetadataMode.NONE),
          metadata: params.includeMetadata ? node.metadata : undefined,
          relationships: params.includeRelationships
            ? node.relationships
            : undefined,
        };
      }),
    );
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
