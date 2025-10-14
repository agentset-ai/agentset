import { MetadataMode } from "@llamaindex/core/schema";
import { QdrantClient, type Schemas } from "@qdrant/js-client-rest";
import { createHash } from "node:crypto";

import { filterFalsy } from "@agentset/utils";

import { makeChunk, metadataToChunk } from "../../chunk";
import {
  VectorStore,
  type VectorStoreMetadata,
  type VectorStoreQueryOptions,
  type VectorStoreQueryResponse,
  type VectorStoreUpsertOptions,
} from "../common/vector-store";
import { QdrantFilterTranslator, type QdrantVectorFilter } from "./filter";

type SearchResult =
  Awaited<ReturnType<QdrantClient["search"]>> extends (infer Item)[]
    ? Item
    : never;

const COLLECTION_PREFIX = "as";
const COLLECTION_NAME_MAX_LENGTH = 63;

export class Qdrant implements VectorStore<QdrantVectorFilter> {
  private readonly client: QdrantClient;
  private readonly collectionName: string;
  private readonly filterTranslator = new QdrantFilterTranslator();
  private collectionInitPromise?: Promise<void>;

  constructor({
    url,
    apiKey,
    namespaceId,
    tenantId,
  }: {
    url: string;
    apiKey?: string;
    namespaceId: string;
    tenantId?: string | null;
  }) {
    this.client = new QdrantClient({
      url,
      ...(apiKey ? { apiKey } : {}),
    });
    this.collectionName = Qdrant.buildCollectionName(namespaceId, tenantId);
  }

  async query(
    params: VectorStoreQueryOptions<QdrantVectorFilter>,
  ): Promise<VectorStoreQueryResponse> {
    let vector: number[];
    switch (params.mode.type) {
      case "semantic":
      case "hybrid":
        vector = params.mode.vector;
        break;
      case "keyword":
        throw new Error("Qdrant does not support keyword-only search");
    }

    const translatedFilter = this.filterTranslator.translate(params.filter);

    const results = await this.client.search(this.collectionName, {
      vector,
      limit: params.topK,
      filter: translatedFilter,
      with_payload: true,
      with_vector: false,
      score_threshold:
        typeof params.minScore === "number" ? params.minScore : undefined,
    });

    return filterFalsy(
      results.map((item) => this.parseResult(item, params)),
    );
  }

  async upsert({ chunks }: VectorStoreUpsertOptions): Promise<void> {
    if (chunks.length === 0) return;

    const nodes = chunks.map((chunk) => makeChunk(chunk));
    await this.ensureCollection(nodes[0]!.vector.length);

    await this.client.upsert(this.collectionName, {
      points: nodes.map((node) => ({
        id: node.id,
        vector: node.vector,
        payload: node.metadata,
      })),
    });
  }

  async deleteByIds(idOrIds: string | string[]): Promise<{ deleted?: number }> {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    if (ids.length === 0) return {};

    await this.client.delete(this.collectionName, {
      points: ids,
    });

    return {};
  }

  async deleteByFilter(
    filter: QdrantVectorFilter,
  ): Promise<{ deleted?: number }> {
    const translatedFilter = this.filterTranslator.translate(filter);

    if (!translatedFilter) {
      return {};
    }

    await this.client.delete(this.collectionName, {
      filter: translatedFilter,
    });

    return {};
  }

  async deleteNamespace(): Promise<{ deleted?: number }> {
    await this.client.deleteCollection(this.collectionName, {});
    this.collectionInitPromise = undefined;
    return {};
  }

  async getDimensions(): Promise<number | "ANY"> {
    try {
      const info = await this.client.getCollection(this.collectionName);
      const size = Qdrant.extractVectorSize(info);
      return typeof size === "number" ? size : "ANY";
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return "ANY";
      }
      throw error;
    }
  }

  private parseResult(
    result: SearchResult,
    params: VectorStoreQueryOptions<QdrantVectorFilter>,
  ) {
    const payload = (result.payload ?? {}) as Record<string, unknown>;
    const metadata = payload as VectorStoreMetadata;
    const node = metadataToChunk(metadata);

    const text =
      node?.getContent(MetadataMode.NONE) ??
      (typeof payload.text === "string" ? payload.text : undefined);

    if (!text) return null;

    return {
      id: result.id.toString(),
      text,
      score:
        typeof result.score === "number" ? result.score : undefined,
      metadata: params.includeMetadata
        ? node?.metadata ?? metadata
        : undefined,
      relationships:
        params.includeRelationships && node ? node.relationships : undefined,
    };
  }

  private async ensureCollection(expectedDimensions: number) {
    if (!this.collectionInitPromise) {
      this.collectionInitPromise = this.initializeCollection(expectedDimensions);
    }

    try {
      await this.collectionInitPromise;
    } catch (error) {
      this.collectionInitPromise = undefined;
      throw error;
    }
  }

  private async initializeCollection(dimensions: number) {
    try {
      const info = await this.client.getCollection(this.collectionName);
      const existingSize = Qdrant.extractVectorSize(info);
      if (
        typeof existingSize === "number" &&
        existingSize !== dimensions
      ) {
        throw new Error(
          `Qdrant collection "${this.collectionName}" has dimension ${existingSize}, expected ${dimensions}`,
        );
      }
    } catch (error) {
      if (!this.isNotFoundError(error)) throw error;

      await this.client.createCollection(this.collectionName, {
        vectors: { size: dimensions, distance: "Cosine" },
      });
    }
  }

  private isNotFoundError(error: unknown) {
    if (error && typeof error === "object") {
      const { status, response, cause } = error as {
        status?: number;
        response?: { status?: number };
        cause?: { status?: number };
      };

      if (status === 404 || response?.status === 404 || cause?.status === 404) {
        return true;
      }
    }

    return (
      error instanceof Error && error.message.toLowerCase().includes("not found")
    );
  }

  private static extractVectorSize(info: {
    config?: {
      params?: {
        vectors?: {
          size?: number;
        } | Record<string, { size?: number }>;
      };
    };
  }) {
    const vectors = info.config?.params?.vectors;
    if (!vectors) return undefined;

    if ("size" in vectors && typeof vectors.size === "number") {
      return vectors.size;
    }

    const first = Object.values(vectors)[0];
    if (first && typeof first.size === "number") {
      return first.size;
    }

    return undefined;
  }

  private static buildCollectionName(
    namespaceId: string,
    tenantId?: string | null,
  ) {
    const sanitizedNamespace = namespaceId.replace(/[^A-Za-z0-9._:-]/g, "_");
    const base = `${COLLECTION_PREFIX}_${sanitizedNamespace}`;

    if (!tenantId) {
      return Qdrant.truncateCollectionName(base);
    }

    const sanitizedTenant = tenantId.replace(/[^A-Za-z0-9._:-]/g, "_");
    const candidate = `${base}_${sanitizedTenant}`;
    return Qdrant.truncateCollectionName(candidate);
  }

  private static truncateCollectionName(name: string) {
    if (name.length <= COLLECTION_NAME_MAX_LENGTH) return name;

    const hash = createHash("sha256").update(name).digest("hex").slice(0, 8);
    const suffix = `_${hash}`;
    const prefix = name.slice(
      0,
      Math.max(0, COLLECTION_NAME_MAX_LENGTH - suffix.length),
    );

    return `${prefix}${suffix}`;
  }
}
