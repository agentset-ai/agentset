import { Turbopuffer as TurbopufferClient } from "@turbopuffer/turbopuffer";

import { makeChunk } from "../../chunk";
import {
  VectorStore,
  VectorStoreMetadata,
  VectorStoreQueryOptions,
  VectorStoreQueryResponse,
  VectorStoreUpsertOptions,
} from "../vector-store";
import { TurbopufferFilterTranslator, TurbopufferVectorFilter } from "./filter";

const schema = {
  id: {
    type: "string",
    filterable: true,
  },
  text: {
    type: "string",
    full_text_search: true, // sets filterable: false, and enables FTS with default settings
  },
};

export class Turbopuffer implements VectorStore<TurbopufferVectorFilter> {
  private readonly client: TurbopufferClient.Namespace;
  private readonly filterTranslator = new TurbopufferFilterTranslator();
  private didSendSchema = false;

  constructor({ apiKey, namespace }: { apiKey: string; namespace: string }) {
    this.client = new TurbopufferClient({
      apiKey,
      region: "aws-us-east-1",
    }).namespace(namespace);
  }

  async query(
    params: VectorStoreQueryOptions<TurbopufferVectorFilter>,
  ): Promise<VectorStoreQueryResponse> {
    const filter = this.filterTranslator.translate({
      ...params.filter,
      ...(params.id ? { id: params.id } : {}),
    });

    const result = await this.client.query({
      rank_by: ["vector", "ANN", params.vector],
      top_k: params.topK,
      filters: filter,
      include_attributes: true,
      distance_metric: "cosine_distance",
      consistency: { level: "strong" },
    });

    return (result.rows ?? []).map(
      ({ id, $dist, vector: _vector, ...metadata }) => ({
        id: id.toString(),
        score: $dist,
        metadata: metadata as VectorStoreMetadata,
      }),
    );
  }

  async upsert({ chunks }: VectorStoreUpsertOptions) {
    const nodes = chunks.map((chunk) =>
      makeChunk(chunk, { removeTextFromMetadata: true }),
    );

    await this.client.write({
      upsert_rows: nodes.map((chunk) => ({
        id: chunk.id,
        vector: chunk.vector,
        text: chunk.text,
        ...chunk.metadata,
      })),
      ...(!this.didSendSchema
        ? { distance_metric: "cosine_distance", schema }
        : {}),
    });

    if (!this.didSendSchema) {
      this.didSendSchema = true;
    }
  }

  async deleteByIds(ids: string[]) {
    const result = await this.client.write({
      deletes: ids.map((id) => Number(id)),
    });

    return { deleted: result.rows_deleted || result.rows_affected };
  }

  async deleteNamespace() {
    await this.client.deleteAll();
    return {};
  }

  async deleteByFilter(filter: TurbopufferVectorFilter) {
    const translatedFilter = this.filterTranslator.translate(filter);
    const result = await this.client.write({
      delete_by_filter: translatedFilter ?? undefined,
    });

    return { deleted: result.rows_deleted || result.rows_affected };
  }

  async getDimensions() {
    const response = await this.client.metadata();
    return (response as unknown as { dimensions: number }).dimensions;
  }
}
