import z from "zod/v4";

import { AnthropicIcon } from "@agentset/ui/icons/anthropic";
import { MicrosoftAzureIcon } from "@agentset/ui/icons/azure";
import { GoogleIcon } from "@agentset/ui/icons/google";
import { OpenAIIcon } from "@agentset/ui/icons/openai";
import { PineconeIcon } from "@agentset/ui/icons/pinecone";
import { QdrantIcon } from "@agentset/ui/icons/qdrant";
import { TurbopufferIcon } from "@agentset/ui/icons/turbopuffer";
import { UpstashIcon } from "@agentset/ui/icons/upstash";
import {
  AzureEmbeddingConfigSchema,
  createVectorStoreSchema,
  EmbeddingConfigSchema,
  GoogleEmbeddingConfigSchema,
  OpenAIEmbeddingConfigSchema,
  PineconeVectorStoreConfigSchema,
  TurbopufferVectorStoreConfigSchema,
  VoyageEmbeddingConfigSchema,
} from "@agentset/validation";

export const embeddingModels: {
  value: z.infer<typeof EmbeddingConfigSchema>["provider"] | string;
  models: z.infer<typeof EmbeddingConfigSchema>["model"][];
  icon: React.ComponentType;
}[] = [
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

export const vectorStores: {
  value: z.infer<typeof createVectorStoreSchema>["provider"] | string;
  icon: React.ComponentType;
  comingSoon?: boolean;
}[] = [
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
    icon: UpstashIcon,
    comingSoon: true,
  },
  {
    value: "qdrant",
    icon: QdrantIcon,
    comingSoon: true,
  },
];
