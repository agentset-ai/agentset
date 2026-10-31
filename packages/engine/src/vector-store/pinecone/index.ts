import { MetadataMode } from "@llamaindex/core/schema";
import {
  Index,
  Pinecone as PineconeClient,
  Errors as PineconeErrors,
} from "@pinecone-database/pinecone";

import { chunkArray, filterFalsy } from "@agentset/utils";

import { makeChunk, metadataToChunk } from "../../chunk";
import {
  VectorStore,
  VectorStoreMetadata,
  VectorStoreMetadataUpdateOptions,
  VectorStoreOrderedQueryOptions,
  VectorStoreQueryOptions,
  VectorStoreQueryResponse,
  VectorStoreUpsertOptions,
} from "../common/vector-store";
import { PineconeFilterTranslator, PineconeVectorFilter } from "./filter";

const METADATA_UPDATE_CONCURRENCY = 10;

export class Pinecone implements VectorStore<PineconeVectorFilter> {
  readonly namespaceId: string;

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
    this.namespaceId = namespaceId;
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
        const node = metadataToChunk({
          id: match.id,
          ...match.metadata,
        });
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

  async queryOrdered(
    _params: VectorStoreOrderedQueryOptions<PineconeVectorFilter>,
  ): Promise<VectorStoreQueryResponse> {
    // TODO: implement via listPaginated (id prefix) + fetch for serverless indexes
    throw new Error("Pinecone does not support ordered queries");
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

  async updateDocumentMetadata(
    documentId: string,
    metadata: VectorStoreMetadata,
    chunkIds?: string[],
    options?: VectorStoreMetadataUpdateOptions,
  ) {
    if (Object.keys(metadata).length === 0) return;

    const runBatch =
      options?.runBatch ?? ((write: () => Promise<void>) => write());
    const updateRecords = async (ids: string[]) => {
      for (const batch of chunkArray(ids, METADATA_UPDATE_CONCURRENCY)) {
        await runBatch(async () => {
          // Keep the guard active until every in-flight write settles.
          const results = await Promise.allSettled(
            batch.map((id) => this.client.update({ id, metadata })),
          );
          const rejected = results.filter(
            (result) => result.status === "rejected",
          );
          const failure =
            rejected.find(
              ({ reason }) =>
                !(reason instanceof PineconeErrors.PineconeNotFoundError),
            ) ?? rejected[0];
          if (failure) throw failure.reason;
        });
      }
    };

    try {
      if (chunkIds) {
        await updateRecords(chunkIds.map((id) => `${documentId}#${id}`));
        return;
      }

      // Listing is supported only by serverless indexes. Stored chunk IDs allow
      // callers to update pod-based indexes without listing their records.
      let paginationToken: string | undefined;
      do {
        const page = await this.client.listPaginated({
          prefix: `${documentId}#`,
          paginationToken,
        });
        await updateRecords(
          filterFalsy((page.vectors ?? []).map(({ id }) => id)),
        );
        paginationToken = page.pagination?.next;
      } while (paginationToken);
    } catch (error) {
      if (error instanceof PineconeErrors.PineconeNotFoundError) return;
      throw error;
    }
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

  supportsOrderedQuery() {
    return false;
  }
}
