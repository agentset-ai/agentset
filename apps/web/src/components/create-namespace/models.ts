import {
  AnthropicIcon,
  GoogleIcon,
  MicrosoftAzureIcon,
  OpenAIIcon,
  PineconeIcon,
  QdrantIcon,
  TurbopufferIcon,
  UpstashIcon,
} from "@agentset/ui";
import {
  AzureEmbeddingConfigSchema,
  GoogleEmbeddingConfigSchema,
  OpenAIEmbeddingConfigSchema,
  PineconeVectorStoreConfigSchema,
  TurbopufferVectorStoreConfigSchema,
  VoyageEmbeddingConfigSchema,
} from "@agentset/validation";

export const embeddingModels = [
  {
    value: AzureEmbeddingConfigSchema.shape.provider.value,
    models: AzureEmbeddingConfigSchema.shape.model.options,
    icon: MicrosoftAzureIcon,
  },
  {
    value: OpenAIEmbeddingConfigSchema.shape.provider.value,
    models: OpenAIEmbeddingConfigSchema.shape.model.options,
    icon: OpenAIIcon,
  },
  {
    value: VoyageEmbeddingConfigSchema.shape.provider.value,
    models: VoyageEmbeddingConfigSchema.shape.model.options,
    icon: AnthropicIcon,
  },
  {
    value: GoogleEmbeddingConfigSchema.shape.provider.value,
    models: GoogleEmbeddingConfigSchema.shape.model.options,
    icon: GoogleIcon,
  },
];

export const vectorStores = [
  {
    value: PineconeVectorStoreConfigSchema.shape.provider.value,
    icon: PineconeIcon,
  },
  {
    value: TurbopufferVectorStoreConfigSchema.shape.provider.value,
    icon: TurbopufferIcon,
  },
  {
    value: "upstash",
    comingSoon: true,
    icon: UpstashIcon,
  },
  {
    value: "qdrant",
    comingSoon: true,
    icon: QdrantIcon,
  },
];
