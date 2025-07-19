import type {
  FetchResponse,
  ListResponse,
  QueryResponse,
  RecordMetadata,
} from "@pinecone-database/pinecone";

export class Pinecone {
  private apiKey: string;
  private indexHost: string;
  private namespace: string;

  constructor({
    apiKey,
    indexHost,
    namespace,
  }: {
    apiKey: string;
    indexHost: string;
    namespace: string;
  }) {
    this.apiKey = apiKey;
    this.indexHost = indexHost;
    this.namespace = namespace;
  }

  private async makeRequest<T>(
    method: string,
    path: string,
    body?: object,
    { includeBody = true }: { includeBody?: boolean } = {},
  ) {
    const combinedBody = {
      namespace: this.namespace,
      ...body,
    };

    let finalPath = path;
    let finalBody = undefined;

    if (includeBody) {
      if (method === "GET") {
        const cleanObject = Object.fromEntries(
          Object.entries(combinedBody as Record<string, string>).filter(
            ([_, value]) => value !== undefined,
          ),
        );
        finalPath = `${path}?${new URLSearchParams(cleanObject).toString()}`;
      } else {
        finalBody = JSON.stringify(combinedBody);
      }
    }

    const response = await fetch(`${this.indexHost}${finalPath}`, {
      method,
      headers: {
        "Api-Key": this.apiKey,
        "Content-Type": "application/json",
        "X-Pinecone-Api-Version": "2025-01",
      },
      body: finalBody,
    });

    const json = await response.json();

    return json as T;
  }

  async list(
    params: {
      prefix?: string;
      paginationToken?: string;
    } = {},
  ): Promise<ListResponse> {
    return this.makeRequest<ListResponse>("GET", "/vectors/list", params);
  }

  async fetch(
    ids: string[],
  ): Promise<
    Omit<FetchResponse, "records"> & { vectors: FetchResponse["records"] }
  > {
    return this.makeRequest<
      Omit<FetchResponse, "records"> & { vectors: FetchResponse["records"] }
    >(
      "GET",
      `/vectors/fetch?namespace=${this.namespace}&${ids.map((id) => `ids=${encodeURIComponent(id)}`).join("&")}`,
      undefined,
      { includeBody: false },
    );
  }

  async query(params: {
    vector: number[];
    topK?: number;
    filter?: object;
    includeMetadata?: boolean;
    includeValues?: boolean;
    sparseVector?: {
      indices: number[];
      values: number[];
    };
    id?: string;
  }): Promise<QueryResponse<RecordMetadata>> {
    return this.makeRequest<QueryResponse<RecordMetadata>>(
      "POST",
      `/query`,
      params,
    );
  }

  async upsert(
    chunks: {
      id: string;
      vector: number[];
      metadata?: Record<string, unknown>;
    }[],
  ) {
    return this.makeRequest<{ success: boolean }>("POST", `/vectors/upsert`, {
      vectors: chunks.map((chunk) => ({
        id: chunk.id,
        values: chunk.vector,
        ...(chunk.metadata && { metadata: chunk.metadata }),
      })),
    });
  }

  async delete(ids: string[]) {
    return this.makeRequest<{ success: boolean }>("POST", `/vectors/delete`, {
      ids,
    });
  }

  async deleteNamespace() {
    return this.makeRequest<{ success: boolean }>("POST", `/vectors/delete`, {
      deleteAll: true,
    });
  }

  async getDimensions() {
    const response = await this.makeRequest<{ dimension: number }>(
      "GET",
      "/describe_index_stats",
      undefined,
      { includeBody: false },
    );
    return response.dimension;
  }
}
