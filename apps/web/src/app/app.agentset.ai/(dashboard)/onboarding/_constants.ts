import type {
  CreateVectorStoreConfig,
  EmbeddingConfig,
} from "@agentset/validation";

export const MANAGED_EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: "MANAGED_OPENAI",
  model: "text-embedding-3-large",
};

export const MANAGED_VECTOR_STORE_CONFIG: CreateVectorStoreConfig = {
  provider: "MANAGED_TURBOPUFFER",
};

export const SAMPLE_DATA_TYPES = [
  {
    id: "product-manuals",
    name: "Product Manuals",
    description: "Technical documentation and user guides",
    icon: "BookOpen",
    available: true,
  },
  {
    id: "support-tickets",
    name: "Support Tickets",
    description: "Customer support conversations",
    icon: "MessageSquare",
    available: false, // TODO: Enable when sample data is ready
  },
  {
    id: "research-papers",
    name: "Research Papers",
    description: "Academic and research documents",
    icon: "GraduationCap",
    available: false, // TODO: Enable when sample data is ready
  },
] as const;

export type SampleDataType = (typeof SAMPLE_DATA_TYPES)[number]["id"];
