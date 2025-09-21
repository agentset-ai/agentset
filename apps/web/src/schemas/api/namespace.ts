import { z } from "zod/v4";

import { toSlug, validSlugRegex } from "@agentset/utils";
import { EmbeddingConfigSchema, VectorStoreSchema } from "@agentset/validation";

export const NamespaceSchema = z
  .object({
    id: z.string().describe("The unique ID of the namespace."),
    name: z.string().describe("The name of the namespace."),
    slug: z.string().describe("The slug of the namespace."),
    organizationId: z
      .string()
      .describe("The ID of the organization that owns the namespace."),
    createdAt: z
      .date()
      .describe("The date and time the namespace was created."),
    embeddingConfig: EmbeddingConfigSchema.nullable().default(null),
    vectorStoreConfig: VectorStoreSchema.nullable().default(null),
  })
  .meta({
    title: "Namespace",
  });

export const createNamespaceSchema = z.object({
  name: z.string().min(1).max(64),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(48, "Slug must be less than 48 characters")
    .transform((v) => toSlug(v))
    .refine((v) => validSlugRegex.test(v), { message: "Invalid slug format" }),
  embeddingConfig: EmbeddingConfigSchema.optional(),
  vectorStoreConfig: VectorStoreSchema.optional(),
});

export const updateNamespaceSchema = createNamespaceSchema
  .pick({
    name: true,
    slug: true,
  })
  .partial();
