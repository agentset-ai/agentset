/**
 * Shared E2E Test Setup
 *
 * Prerequisites:
 * - Server must be running on localhost:3000
 * - Set TEST_API_KEY environment variable for authenticated endpoints
 * - Set TEST_NAMESPACE_ID environment variable for namespace-specific tests
 *
 * Note: Response schemas are based on source schemas in @/schemas/api/*
 * but with date fields transformed to handle JSON ISO string serialization.
 */

import { z } from "zod/v4";

import { NamespaceSchema } from "@/schemas/api/namespace";
import { IngestJobSchema } from "@/schemas/api/ingest-job";
import { DocumentSchema } from "@/schemas/api/document";
import { NodeSchema as SourceNodeSchema } from "@/schemas/api/node";
// Note: UploadResultSchema and HostingSchema are defined locally to avoid
// importing modules that trigger environment variable validation

// ─────────────────────────────────────────────────────────────────────────────
// Test Constants
// ─────────────────────────────────────────────────────────────────────────────

/* eslint-disable no-restricted-properties, turbo/no-undeclared-env-vars */
export const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
export const API_KEY = process.env.TEST_API_KEY || "";
export const NAMESPACE_ID = process.env.TEST_NAMESPACE_ID || "ns_cmkmgags90001uprqtqvjxkdq";
/* eslint-enable no-restricted-properties, turbo/no-undeclared-env-vars */

// Fake IDs for testing error cases (formatted to match real ID patterns)
export const NONEXISTENT_NAMESPACE_ID = "ns_nonexistent123456";
export const NONEXISTENT_JOB_ID = "job_nonexistent12345678901";
export const NONEXISTENT_DOCUMENT_ID = "doc_nonexistent12345678901";
export const FAKE_JOB_ID = "job_somejobid123456789012";
export const FAKE_DOCUMENT_ID = "doc_someid123456789012345";

// ─────────────────────────────────────────────────────────────────────────────
// Schema Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Helper to transform ISO date strings to Date objects (JSON serializes dates as strings)
export const dateStringToDate = z.iso.datetime().transform((v) => new Date(v));
const nullableDateStringToDate = dateStringToDate.nullable().default(null);

// Helper to create success response schema (matches openapi/responses.ts)
const successSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

// Helper to create paginated response schema
const paginatedSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(dataSchema),
    pagination: z.object({
      nextCursor: z.string().nullable(),
      prevCursor: z.string().nullable(),
      hasMore: z.boolean(),
    }),
  });

// ─────────────────────────────────────────────────────────────────────────────
// Response Schemas (based on source schemas with date transformations)
// ─────────────────────────────────────────────────────────────────────────────

// Namespace schema - extends source with date string handling
export const NamespaceResponseSchema = NamespaceSchema.omit({
  createdAt: true,
  embeddingConfig: true,
  vectorStoreConfig: true,
}).extend({
  createdAt: dateStringToDate,
});

export const listNamespacesResponseSchema = successSchema(z.array(NamespaceResponseSchema));
export const namespaceResponseSchema = successSchema(NamespaceResponseSchema);

// Ingest Job schema - extends source with date string handling
export const IngestJobResponseSchema = IngestJobSchema.omit({
  createdAt: true,
  queuedAt: true,
  preProcessingAt: true,
  processingAt: true,
  completedAt: true,
  failedAt: true,
}).extend({
  createdAt: dateStringToDate,
  queuedAt: nullableDateStringToDate,
  preProcessingAt: nullableDateStringToDate,
  processingAt: nullableDateStringToDate,
  completedAt: nullableDateStringToDate,
  failedAt: nullableDateStringToDate,
});

export const ingestJobResponseSchema = successSchema(IngestJobResponseSchema);
export const paginatedIngestJobsResponseSchema = paginatedSchema(IngestJobResponseSchema);

// Re-ingest response schema (only returns id)
export const reIngestResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
  }),
});

// Document schema - extends source with date string handling
export const DocumentResponseSchema = DocumentSchema.omit({
  createdAt: true,
  queuedAt: true,
  preProcessingAt: true,
  processingAt: true,
  completedAt: true,
  failedAt: true,
}).extend({
  createdAt: dateStringToDate,
  queuedAt: nullableDateStringToDate,
  preProcessingAt: nullableDateStringToDate,
  processingAt: nullableDateStringToDate,
  completedAt: nullableDateStringToDate,
  failedAt: nullableDateStringToDate,
});

export const documentResponseSchema = successSchema(DocumentResponseSchema);
export const paginatedDocumentsResponseSchema = paginatedSchema(DocumentResponseSchema);

// Search result node schema - imported directly (no date fields)
export const NodeSchema = SourceNodeSchema;
export const searchResponseSchema = successSchema(z.array(NodeSchema));

// Upload result schema - defined locally to avoid env var validation from @agentset/storage
export const UploadResultSchema = z.object({
  url: z.url(),
  key: z.string(),
});
export const uploadResponseSchema = successSchema(UploadResultSchema);
export const batchUploadResponseSchema = successSchema(z.array(UploadResultSchema));

// Hosting schema - defined locally to avoid env var validation from @agentset/validation
export const HostingResponseSchema = z.object({
  namespaceId: z.string(),
  title: z.string().nullable(),
  slug: z.string().nullable(),
  logo: z.string().nullable(),
  ogTitle: z.string().nullable(),
  ogDescription: z.string().nullable(),
  ogImage: z.string().nullable(),
  systemPrompt: z.string().nullable(),
  exampleQuestions: z.array(z.string()),
  exampleSearchQueries: z.array(z.string()),
  welcomeMessage: z.string().nullable(),
  citationMetadataPath: z.string().nullable(),
  searchEnabled: z.boolean(),
  rerankConfig: z.object({ model: z.string(), limit: z.number() }).nullable(),
  llmConfig: z.object({ model: z.string() }).nullable(),
  topK: z.number(),
  protected: z.boolean(),
  allowedEmails: z.array(z.string()),
  allowedEmailDomains: z.array(z.string()),
  createdAt: dateStringToDate,
  updatedAt: dateStringToDate,
});
export const hostingResponseSchema = successSchema(HostingResponseSchema);

// Warm-up response schema
export const warmUpResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    status: z.literal(true),
  }),
});

// Error schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Request Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Helper for authenticated requests
export const authHeaders = () => ({
  Authorization: `Bearer ${API_KEY}`,
});

// Helper for JSON requests
export const jsonHeaders = () => ({
  ...authHeaders(),
  "Content-Type": "application/json",
});
