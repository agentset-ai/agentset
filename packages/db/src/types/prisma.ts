/* eslint-disable @typescript-eslint/no-namespace */
import type {
  DocumentPayload as _DocumentPayload,
  DocumentProperties as _DocumentProperties,
  IngestJobConfig as _IngestJobConfig,
  IngestJobPayload as _IngestJobPayload,
  EmbeddingConfig,
  LLM,
  RerankingModel,
  VectorStoreConfig,
} from "@agentset/validation";

declare global {
  export namespace PrismaJson {
    type ConnectionConfig = {
      authType: "OAUTH2";
      credentials: {
        accessToken: string;
        refreshToken: string | null;
      };
    };

    type IngestJobPayload = _IngestJobPayload;
    type IngestJobConfig = _IngestJobConfig;
    type NamespaceVectorStoreConfig = VectorStoreConfig;

    type NamespaceFileStoreConfig = {
      provider: "S3";
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      endpoint: string;
      region: string;
      prefix?: string;
    };

    type NamespaceEmbeddingConfig = EmbeddingConfig;
    type DocumentProperties = _DocumentProperties;

    type HostingRerankConfig = { model: RerankingModel; limit?: number };
    type HostingLLMConfig = { model: LLM };

    type DocumentSource = _DocumentPayload;
    type DocumentConfig = _IngestJobConfig;
  }
}
