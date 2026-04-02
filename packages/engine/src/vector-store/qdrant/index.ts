import type { Schemas } from "@qdrant/js-client-rest";
import { MetadataMode } from "@llamaindex/core/schema";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v5 as uuidv5 } from "uuid";

import { filterFalsy } from "@agentset/utils";

import { makeChunk, metadataToChunk } from "../../chunk";
import type {
  VectorStore,
  VectorStoreMetadata,
  VectorStoreQueryOptions,
  VectorStoreQueryResponse,
  VectorStoreUpsertOptions,
} from "../common/vector-store";
import type { QdrantVectorFilter } from "./filter";
import { QdrantFilterTranslator } from "./filter";

const ORIGINAL_ID_FIELD = "_agentset_id";
const DENSE_VECTOR_NAME = "dense";

function toQdrantId(originalId: string): string {
  return uuidv5(originalId, uuidv5.DNS);
}

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (error as any).status === 404;
}

function mapPoint(
  point: Schemas["ScoredPoint"],
  params: Pick<
    VectorStoreQueryOptions,
    "includeMetadata" | "includeRelationships"
  >,
) {
  const payload = point.payload ?? {};
  const originalId =
    (payload[ORIGINAL_ID_FIELD] as string | undefined) ?? String(point.id);

  const { [ORIGINAL_ID_FIELD]: _removed, ...payloadForChunk } = payload;

  const node = metadataToChunk({
    id: originalId,
    ...payloadForChunk,
  } as VectorStoreMetadata);

  if (!node) return null;

  return {
    id: originalId,
    score: point.score,
    text: node.getContent(MetadataMode.NONE),
    metadata: params.includeMetadata ? node.metadata : undefined,
    relationships: params.includeRelationships ? node.relationships : undefined,
  };
}

export class Qdrant implements VectorStore<QdrantVectorFilter> {
  private readonly client: QdrantClient;
  private readonly collectionName: string;
  private readonly filterTranslator = new QdrantFilterTranslator();
  private collectionExists: boolean | null = null;

  constructor({
    url,
    apiKey,
    namespaceId,
    tenantId,
  }: {
    url: string;
    apiKey?: string;
    namespaceId: string;
    tenantId?: string;
  }) {
    this.client = new QdrantClient({
      url,
      ...(apiKey ? { apiKey } : {}),
      checkCompatibility: false,
    });

    const suffix = tenantId ? `_${tenantId}` : "";
    this.collectionName = `agentset_${namespaceId}${suffix}`;
  }

  private async ensureCollection(vectorSize: number): Promise<void> {
    if (this.collectionExists === true) return;

    const exists = await this.collectionExistsOnServer();
    if (!exists) {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          [DENSE_VECTOR_NAME]: { size: vectorSize, distance: "Cosine" },
        },
      });
    }
    await this.client.createPayloadIndex(this.collectionName, {
      field_name: "text",
      field_schema: "text",
      wait: true,
    });
    this.collectionExists = true;
  }

  private async collectionExistsOnServer(): Promise<boolean> {
    try {
      await this.client.getCollection(this.collectionName);
      return true;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  }

  async query(
    params: VectorStoreQueryOptions<QdrantVectorFilter>,
  ): Promise<VectorStoreQueryResponse> {
    try {
      const textCondition: Schemas["Condition"] | undefined =
        params.mode.type !== "semantic"
          ? { key: "text", match: { text: params.mode.text } }
          : undefined;

      const response = await this.client.query(this.collectionName, {
        ...(params.mode.type !== "keyword"
          ? { query: params.mode.vector, using: DENSE_VECTOR_NAME }
          : {}),
        filter: this.buildFilter(params.filter, params.id, textCondition),
        limit: params.topK,
        with_payload: true as const,
        with_vector: false as const,
        ...(params.mode.type === "semantic" &&
        typeof params.minScore === "number"
          ? { score_threshold: params.minScore }
          : {}),
      });

      return filterFalsy(response.points.map((p) => mapPoint(p, params)));
    } catch (error) {
      if (isNotFoundError(error)) return [];
      throw error;
    }
  }

  private buildFilter(
    filter: QdrantVectorFilter | undefined,
    id: string | undefined,
    extra?: Schemas["Condition"],
  ): Schemas["Filter"] | undefined {
    const qdrantFilter = this.filterTranslator.translate(filter);

    const extraConditions: Schemas["Condition"][] = [];
    if (id)
      extraConditions.push({ key: ORIGINAL_ID_FIELD, match: { value: id } });
    if (extra) extraConditions.push(extra);

    if (!extraConditions.length) return qdrantFilter;

    return {
      must: [
        ...(qdrantFilter?.must
          ? Array.isArray(qdrantFilter.must)
            ? qdrantFilter.must
            : [qdrantFilter.must]
          : []),
        ...extraConditions,
      ],
      ...(qdrantFilter?.should ? { should: qdrantFilter.should } : {}),
      ...(qdrantFilter?.must_not ? { must_not: qdrantFilter.must_not } : {}),
    };
  }

  async upsert({ chunks }: VectorStoreUpsertOptions): Promise<void> {
    const nodes = chunks.map((chunk) => makeChunk(chunk));
    const vectorSize = nodes[0]!.vector.length;

    await this.ensureCollection(vectorSize);

    const points = nodes.map((node) => ({
      id: toQdrantId(node.id),
      vector: { [DENSE_VECTOR_NAME]: node.vector },
      payload: {
        ...node.metadata,
        [ORIGINAL_ID_FIELD]: node.id,
      },
    }));

    await this.client.upsert(this.collectionName, {
      points,
      wait: true,
    });
  }

  async deleteByIds(idOrIds: string | string[]): Promise<{ deleted?: number }> {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const qdrantIds = ids.map(toQdrantId);

    try {
      await this.client.delete(this.collectionName, {
        points: qdrantIds,
        wait: true,
      });
      return { deleted: qdrantIds.length };
    } catch (error) {
      if (isNotFoundError(error)) return { deleted: 0 };
      throw error;
    }
  }

  async deleteByFilter(
    filter: QdrantVectorFilter,
  ): Promise<{ deleted?: number }> {
    const qdrantFilter = this.filterTranslator.translate(filter);
    if (!qdrantFilter) return { deleted: 0 };

    try {
      await this.client.delete(this.collectionName, {
        filter: qdrantFilter,
        wait: true,
      });
      return { deleted: undefined };
    } catch (error) {
      if (isNotFoundError(error)) return { deleted: 0 };
      throw error;
    }
  }

  async deleteNamespace(): Promise<{ deleted?: number }> {
    this.collectionExists = null;
    try {
      await this.client.deleteCollection(this.collectionName);
      return { deleted: undefined };
    } catch (error) {
      if (isNotFoundError(error)) return { deleted: undefined };
      throw error;
    }
  }

  async getDimensions(): Promise<number | "ANY"> {
    try {
      const info = await this.client.getCollection(this.collectionName);
      const vectors = info.config?.params?.vectors;
      if (vectors) {
        if ("size" in vectors) return (vectors as Schemas["VectorParams"]).size;
        const dense = (
          vectors as Record<string, Schemas["VectorParams"] | undefined>
        )[DENSE_VECTOR_NAME];
        if (dense?.size) return dense.size;
      }
      return "ANY";
    } catch (error) {
      if (isNotFoundError(error)) return "ANY";
      throw error;
    }
  }

  async warmCache() {
    return "UNSUPPORTED" as const;
  }

  supportsKeyword() {
    return true;
  }
}
