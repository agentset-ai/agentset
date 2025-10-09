import type {
  SearchIterator,
  SearchResult,
  SelectFields,
} from "@azure/search-documents";
import {
  AzureKeyCredential,
  odata,
  SearchClient,
} from "@azure/search-documents";
import { MetadataMode, TextNode } from "@llamaindex/core/schema";

import { metadataToChunk } from "../chunk";
import { env } from "../env";
import { VectorStoreResult } from "../vector-store/common/vector-store";

export type KeywordSearchChunk = {
  id: string;
  text: string;
  namespaceId: string;
  tenantId?: string | null;
  documentId: string;
  metadata: string;
  metadata_array?: {
    key: string;
    value: string;
  }[];
};

const topLevelMetadataKeys = [
  "namespaceId",
  "documentId",
  "tenantId",
] satisfies (keyof KeywordSearchChunk)[];

const keywordSearchClient = new SearchClient<KeywordSearchChunk>(
  env.AZURE_SEARCH_URL,
  env.AZURE_SEARCH_INDEX,
  new AzureKeyCredential(env.AZURE_SEARCH_KEY),
);

const safeParse = (json: string) => {
  try {
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
};

export class KeywordStore {
  constructor(
    private readonly namespaceId: string,
    private readonly tenantId?: string | null,
  ) {}

  private async asyncIterableToArray<T extends object>(
    iterable: SearchIterator<T, SelectFields<T>>,
  ) {
    const results: SearchResult<T, SelectFields<T>>[] = [];
    for await (const result of iterable) {
      results.push(result);
    }
    return results;
  }

  private encodeId(id: string) {
    return id.replaceAll("#", "_"); // Keys can only contain letters, digits, underscore (_), dash (-), or equal sign (=)
  }

  private decodeId(id: string) {
    return id.replaceAll("_", "#"); // Keys can only contain letters, digits, underscore (_), dash (-), or equal sign (=)
  }

  async search(
    query: string,
    {
      documentId,
      page = 1,
      limit = 10,
      includeMetadata,
      includeRelationships,
      minScore,
      filter: extraFilter,
    }: {
      documentId?: string;
      page?: number;
      limit?: number;
      includeMetadata?: boolean;
      includeRelationships?: boolean;
      minScore?: number;
      filter?: string; // odata filter string
    } = {},
  ) {
    let filter = odata`namespaceId eq '${this.namespaceId}'`;
    if (this.tenantId) filter += ` and tenantId eq '${this.tenantId}'`;
    if (documentId) filter += ` and documentId eq '${documentId}'`;
    if (extraFilter) filter += ` and ${extraFilter}`;

    const results = await keywordSearchClient.search(query, {
      filter,
      top: limit,
      skip: (page - 1) * limit,
      searchFields: ["text"],
      highlightFields: "text",
      includeTotalCount: true,
      select: [
        "id",
        "namespaceId",
        "documentId",
        "tenantId",
        "metadata",
        "text",
      ],
    });

    const total = results.count;
    const totalPages = total ? Math.ceil(total / limit) : 1;

    let resultsArray = await this.asyncIterableToArray(results.results);
    if (minScore) {
      resultsArray = resultsArray.filter((result) => result.score >= minScore);
    }

    return {
      total,
      totalPages,
      perPage: limit,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      results: resultsArray.map((result) => {
        const document = result.document;
        const metadata = safeParse(result.document.metadata) ?? {};
        const id = this.decodeId(document.id);

        // add top-level fields back to metadata to match vector store format
        topLevelMetadataKeys.forEach((key) => {
          metadata[key] = document[key];
        });

        const node =
          metadataToChunk(metadata) ||
          new TextNode({ id_: id, text: document.text, metadata });

        return {
          id,
          score: result.score,
          highlights: result.highlights?.text ?? [],
          text: node.getContent(MetadataMode.NONE),
          metadata: includeMetadata ? node.metadata : undefined,
          relationships: includeRelationships ? node.relationships : undefined,
        };
      }) satisfies VectorStoreResult[],
    };
  }

  async listIds({
    page = 1,
    limit = 1000,
    documentId,
  }: {
    page?: number;
    limit?: number;
    documentId?: string;
  } = {}) {
    let filter = odata`namespaceId eq '${this.namespaceId}'`;
    if (this.tenantId) filter += ` and tenantId eq '${this.tenantId}'`;
    if (documentId) filter += ` and documentId eq '${documentId}'`;

    const results = await keywordSearchClient.search(undefined, {
      filter,
      top: limit,
      select: ["id"],
      includeTotalCount: true,
      skip: (page - 1) * limit,
    });

    const total = results.count;
    const totalPages = total ? Math.ceil(total / limit) : 1;

    const ids: string[] = [];
    for await (const result of results.results) {
      ids.push(this.decodeId(result.document.id));
    }

    return {
      total,
      totalPages,
      perPage: limit,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      ids,
    };
  }

  async upsert(
    chunks: {
      id: string;
      text: string;
      documentId: string;
      metadata?: Record<string, unknown>;
    }[],
  ) {
    await keywordSearchClient.mergeOrUploadDocuments(
      chunks.map((chunk) => {
        const metadata = chunk.metadata ?? {};

        // delete these from metadata since they're already top-level fields
        topLevelMetadataKeys.forEach((key) => {
          if (metadata[key]) {
            metadata[key] = undefined;
          }
        });

        return {
          id: this.encodeId(chunk.id),
          text: chunk.text,
          namespaceId: this.namespaceId,
          tenantId: this.tenantId ?? null,
          documentId: chunk.documentId,
          metadata: JSON.stringify(metadata),
          metadata_array: Object.entries(metadata)
            .filter(
              ([key, value]) =>
                value !== undefined &&
                key !== "_node_content" &&
                key !== "_node_type",
            )
            .map(([key, value]) => ({
              key,
              value: typeof value === "string" ? value : JSON.stringify(value),
            })),
        };
      }),
    );
  }

  async deleteByIds(ids: string[]) {
    await keywordSearchClient.deleteDocuments(
      "id",
      ids.map((id) => this.encodeId(id)),
    );
  }
}
