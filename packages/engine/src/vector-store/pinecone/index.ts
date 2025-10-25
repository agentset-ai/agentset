import { MetadataMode } from "@llamaindex/core/schema";
import {
  Index,
  Pinecone as PineconeClient,
  Errors as PineconeErrors,
} from "@pinecone-database/pinecone";

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
    const mode = params.mode;
    // TODO: implement real keyword + hybrid search for pinecone
    if (mode.type === "keyword") {
      throw new Error("Pinecone does not support keyword mode");
    }

    const translatedFilter = this.filterTranslator.translate(params.filter);
    const result = await this.client.query({
      ...(params.id && { id: params.id }),
      topK: params.topK,
      filter: translatedFilter ?? undefined,
      vector: mode.vector,
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
    try {
      if (Array.isArray(idOrIds)) {
        await this.client.deleteMany(idOrIds);
        return { deleted: undefined };
      }

      await this.client.deleteOne(idOrIds);
      return { deleted: undefined };
    } catch (error) {
      if (error instanceof PineconeErrors.PineconeNotFoundError)
        return { deleted: undefined };

      throw error;
    }
  }

  async deleteByFilter(filter: PineconeVectorFilter) {
    const translatedFilter = this.filterTranslator.translate(filter);
    try {
      await this.client.deleteMany((translatedFilter as any) ?? undefined);
      return { deleted: undefined };
    } catch (error) {
      if (error instanceof PineconeErrors.PineconeNotFoundError)
        return { deleted: undefined };

      throw error;
    }
  }

  async deleteNamespace() {
    try {
      await this.client.deleteAll();
      return { deleted: undefined };
    } catch (error) {
      if (error instanceof PineconeErrors.PineconeNotFoundError)
        return { deleted: undefined };

      throw error;
    }
  }

  async warmCache() {
    return "UNSUPPORTED" as const;
  }

  async getDimensions() {
    const response = await this.client.describeIndexStats();
    return response.dimension!;
  }

  supportsKeyword() {
    return false;
  }
}
