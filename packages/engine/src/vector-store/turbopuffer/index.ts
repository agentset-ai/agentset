import { Turbopuffer as TurbopufferClient } from "@turbopuffer/turbopuffer";

import { filterFalsy } from "@agentset/utils";

import { makeChunk, metadataToChunk } from "../../chunk";
import {
  VectorStore,
  VectorStoreMetadata,
  VectorStoreQueryOptions,
  VectorStoreQueryResponse,
  VectorStoreUpsertOptions,
} from "../common/vector-store";
import { TurbopufferFilterTranslator, TurbopufferVectorFilter } from "./filter";

const schema = {
  id: { type: "string" },
  text: {
    type: "string",
    full_text_search: true, // sets filterable: false, and enables FTS with default settings
  },
  _node_content: {
    type: "string",
    // disables filtering to save costs
    filterable: false,
  },
};

export class Turbopuffer implements VectorStore<TurbopufferVectorFilter> {
  private readonly _client: TurbopufferClient;
  private readonly client: TurbopufferClient.Namespace;

  private readonly filterTranslator = new TurbopufferFilterTranslator();
  private didSendSchema = false;

  constructor({
    apiKey,
    namespaceId,
    tenantId,
    region,
  }: {
    apiKey: string;
    namespaceId: string;
    region: string;
    tenantId?: string;
  }) {
    // note that Turbopuffer uses allows `[A-Za-z0-9-_.]{1,128}`
    // @see https://turbopuffer.com/docs/write
    // our max size will be as_ (3) + namespaceId (25) + _ (1) + tenantId (64) = 93
    const namespace = `as_${namespaceId}${tenantId ? `_${tenantId}` : ""}`;

    this._client = new TurbopufferClient({ apiKey, region, logLevel: "error" });
    this.client = this._client.namespace(namespace);
  }

  // ===============================================
  // Rank Fusion
  // ===============================================
  // There are many ways to fuse the results, see https://github.com/AmenRa/ranx?tab=readme-ov-file#fusion-algorithms
  // That's why it's not built into turbopuffer (yet), as you may otherwise not be
  // able to express the fusing you need.
  private reciprocalRankFusion(
    resultLists: TurbopufferClient.Row[][],
    k: number,
  ): TurbopufferClient.Row[] {
    const scores: { [key: string]: number } = {};
    const allResults: { [key: string]: TurbopufferClient.Row } = {};
    for (const results of resultLists) {
      for (let rank = 1; rank <= results.length; rank++) {
        const item = results[rank - 1]!;
        scores[item.id] = (scores[item.id] || 0) + 1.0 / (k + rank);
        allResults[item.id] = item;
      }
    }

    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([docId]) => allResults[docId]!);
  }

  // $dist is the cosine distance between 0 and 2, lower is better
  // we convert it to a number between 0 and 1
  private normalizeDistance(distance: number) {
    return (2 - distance) / 2;
  }

  async query(
    params: VectorStoreQueryOptions<TurbopufferVectorFilter>,
  ): Promise<VectorStoreQueryResponse> {
    const filter = this.filterTranslator.translate({
      ...params.filter,
      ...(params.id ? { id: params.id } : {}),
    });

    try {
      let results: TurbopufferClient.Row[] = [];
      const commonQueryParams: TurbopufferClient.NamespaceQueryParams = {
        top_k: params.topK,
        filters: filter,
        include_attributes: params.includeMetadata ? undefined : ["id", "text"],
        exclude_attributes: params.includeMetadata ? ["vector"] : undefined,
        consistency: { level: "eventual" },
      };

      if (params.mode.type === "semantic" || params.mode.type === "keyword") {
        const result = await this.client.query({
          ...commonQueryParams,
          ...(params.mode.type === "semantic"
            ? {
                rank_by: ["vector", "ANN", params.mode.vector],
                distance_metric: "cosine_distance",
              }
            : { rank_by: ["text", "BM25", params.mode.text] }),
        });
        results = result.rows ?? [];
      } else {
        // hybrid mode
        // we need to implement RRF (Reciprocal Rank Fusion)
        // @see https://turbopuffer.com/docs/hybrid
        const result = await this.client.multiQuery({
          queries: [
            {
              ...commonQueryParams,
              rank_by: ["vector", "ANN", params.mode.vector],
              distance_metric: "cosine_distance",
            },
            {
              ...commonQueryParams,
              rank_by: ["text", "BM25", params.mode.text],
            },
          ],
        });

        results = this.reciprocalRankFusion(
          [
            result.results[0]?.rows ?? [], // vector
            result.results[1]?.rows ?? [], // text
          ],
          params.topK,
        );
      }

      // Filter by minimum score only for semantic mode
      // because otherwise the scores will not be between 0 and 1
      if (
        params.mode.type === "semantic" &&
        typeof params.minScore === "number"
      ) {
        results = results.filter(
          (match) =>
            typeof match.$dist === "number" &&
            this.normalizeDistance(match.$dist!) >= params.minScore!,
        );
      }

      // Parse metadata to nodes
      return filterFalsy(
        results.map(({ id, $dist: distance, text, ...metadata }) => {
          const finalMetadata = params.includeMetadata
            ? (metadata as VectorStoreMetadata)
            : undefined;

          return {
            id: id.toString(),
            score:
              typeof distance === "number"
                ? this.normalizeDistance(distance)
                : undefined,
            text: text as string,
            metadata: finalMetadata,
            // relationships: finalRelationships,
          };
        }),
      );
    } catch (e) {
      // if the namespace is not found, return an empty array
      if (e instanceof TurbopufferClient.NotFoundError) return [];
      throw e;
    }
  }

  async upsert({ chunks }: VectorStoreUpsertOptions) {
    const nodes = chunks.map((chunk) =>
      makeChunk(chunk, { removeTextFromMetadata: true }),
    );

    const shouldSendSchema = !this.didSendSchema;
    if (shouldSendSchema) this.didSendSchema = true;

    try {
      await this.client.write({
        upsert_rows: nodes.map((chunk) => ({
          id: chunk.id,
          vector: chunk.vector,
          text: chunk.text,
          ...chunk.metadata,
        })),
        disable_backpressure: true,
        ...(shouldSendSchema
          ? { distance_metric: "cosine_distance", schema }
          : {}),
      });
    } catch (e) {
      // if schema was sent, but failed, set didSendSchema to false
      if (shouldSendSchema) this.didSendSchema = false;
      // rethrow the error
      throw e;
    }
  }

  async deleteByIds(ids: string[]) {
    const result = await this.client.write({
      deletes: ids.map((id) => id),
      disable_backpressure: true,
    });

    return { deleted: result.rows_deleted || result.rows_affected };
  }

  async deleteNamespace() {
    try {
      await this.client.deleteAll();
      return {};
    } catch (error) {
      if (error instanceof TurbopufferClient.NotFoundError) return {};

      throw error;
    }
  }

  async deleteByFilter(filter: TurbopufferVectorFilter) {
    const translatedFilter = this.filterTranslator.translate(filter);

    try {
      const result = await this.client.write({
        delete_by_filter: translatedFilter ?? undefined,
      });

      return { deleted: result.rows_deleted || result.rows_affected };
    } catch (error) {
      if (error instanceof TurbopufferClient.NotFoundError) return {};

      throw error;
    }
  }

  async warmCache() {
    try {
      await this.client.hintCacheWarm();
    } catch (error) {
      if (error instanceof TurbopufferClient.NotFoundError) return;
      throw error;
    }
  }

  async getDimensions() {
    const test = this._client.namespace("_agentset_test");
    // try creating a test row and deleting it to validate api key
    await test.write({
      upsert_rows: [
        {
          id: 1,
          vector: [1, 2, 3],
        },
      ],
    });
    await test.deleteAll();

    return "ANY" as const;
  }

  supportsKeyword() {
    return true;
  }
}
