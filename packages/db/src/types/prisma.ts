/* eslint-disable @typescript-eslint/no-namespace */
import type {
  DocumentPayload as _DocumentPayload,
  DocumentProperties as _DocumentProperties,
  IngestJobConfig as _IngestJobConfig,
  IngestJobPayload as _IngestJobPayload,
  EmbeddingConfig,
  VectorStoreConfig,
} from "@agentset/validation";

type OpenAILanguageModel = "gpt-4o" | "gpt-4o-mini";

export type LLMConfig =
  | {
      provider: "OPENAI";
      model: OpenAILanguageModel;
      apiKey: string;
    }
  | {
      provider: "AZURE_OPENAI";
      model: OpenAILanguageModel;
      baseUrl: string;
      deployment: string;
      apiKey: string;
      apiVersion?: string;
    };

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
    type NamespaceLLMConfig = LLMConfig;
    type DocumentProperties = _DocumentProperties;

    type DocumentSource = _DocumentPayload;
    type DocumentConfig = _IngestJobConfig;
  }
}
