import { slugSchema, uploadedImageSchema } from "@/schemas/api/misc";
import { z } from "zod/v4";

import { llmSchema, rerankerSchema } from "@agentset/validation";

export const HostingSchema = z
  .object({
    namespaceId: z
      .string()
      .describe("The ID of the namespace this hosting belongs to."),
    title: z
      .string()
      .nullable()
      .default(null)
      .describe("The title displayed on the hosted interface."),
    slug: z
      .string()
      .nullable()
      .default(null)
      .describe("The unique slug for accessing the hosted interface."),
    logo: z
      .string()
      .nullable()
      .default(null)
      .describe("The URL or base64 encoded image of the logo."),
    ogTitle: z
      .string()
      .nullable()
      .default(null)
      .describe("Custom Open Graph title for social media sharing."),
    ogDescription: z
      .string()
      .nullable()
      .default(null)
      .describe("Custom Open Graph description for social media sharing."),
    ogImage: z
      .string()
      .nullable()
      .default(null)
      .describe("Custom Open Graph image URL for social media sharing."),
    systemPrompt: z
      .string()
      .nullable()
      .default(null)
      .describe("The system prompt used for the chat interface."),
    exampleQuestions: z
      .array(z.string())
      .default([])
      .describe("Example questions to display to users in the chat interface."),
    exampleSearchQueries: z
      .array(z.string())
      .default([])
      .describe(
        "Example search queries to display to users in the search interface.",
      ),
    welcomeMessage: z
      .string()
      .nullable()
      .default(null)
      .describe("Welcome message displayed to users."),
    citationMetadataPath: z
      .string()
      .nullable()
      .default(null)
      .describe("Path to metadata field used for citations."),
    searchEnabled: z
      .boolean()
      .default(true)
      .describe("Whether search functionality is enabled."),
    rerankConfig: z
      .object({
        model: rerankerSchema,
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(15)
          .describe("Number of documents after reranking."),
      })
      .nullable()
      .default(null)
      .describe("Configuration for the reranking model."),
    llmConfig: z
      .object({ model: llmSchema })
      .nullable()
      .default(null)
      .describe("Configuration for the LLM model."),
    topK: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(50)
      .describe("Number of documents to retrieve from vector store."),
    protected: z
      .boolean()
      .default(true)
      .describe("Whether the hosted interface is protected by authentication."),
    allowedEmails: z
      .array(z.string())
      .default([])
      .describe("List of allowed email addresses (when protected is true)."),
    allowedEmailDomains: z
      .array(z.string())
      .default([])
      .describe("List of allowed email domains (when protected is true)."),
    createdAt: z.date().describe("The date and time the hosting was created."),
    updatedAt: z
      .date()
      .describe("The date and time the hosting was last updated."),
  })
  .meta({
    id: "hosting",
    title: "Hosting",
  });

export const updateHostingSchema = z.object({
  title: z.string().min(1).optional(),
  slug: slugSchema.optional(),
  logo: uploadedImageSchema.nullish(),
  ogTitle: z.string().max(70).optional(),
  ogDescription: z.string().max(200).optional(),
  ogImage: uploadedImageSchema.nullish(),
  protected: z.boolean().optional(),
  allowedEmails: z.array(z.email().trim().toLowerCase()).optional(),
  allowedEmailDomains: z.array(z.string().trim().toLowerCase()).optional(),
  systemPrompt: z.string().optional(),
  exampleQuestions: z.array(z.string()).max(4).optional(),
  exampleSearchQueries: z.array(z.string()).max(4).optional(),
  welcomeMessage: z.string().optional(),
  citationMetadataPath: z.string().optional(),
  searchEnabled: z.boolean().optional(),
  rerankModel: rerankerSchema.optional(),
  llmModel: llmSchema.optional(),
  topK: z.number().int().min(1).max(100).optional(),
  rerankLimit: z.number().int().min(1).max(100).optional(),
});
