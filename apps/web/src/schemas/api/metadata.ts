import { z } from "zod/v4";

import {
  metadataFilterSchema,
  metadataPatchSchema,
} from "@agentset/validation";

export const updateMetadataSchema = z.strictObject({
  filter: metadataFilterSchema.describe(
    "Match custom metadata. Documents include inherited job metadata, with document overrides taking precedence. An empty object matches all records in the current tenant.",
  ),
  metadata: metadataPatchSchema.describe(
    "Metadata keys to merge. Existing keys and parsing options are preserved.",
  ),
});

export const metadataUpdateAcceptedSchema = z.object({
  runId: z
    .string()
    .nullable()
    .describe("The update run ID, or null when nothing matched."),
  matchedDocuments: z.int().nonnegative(),
  matchedJobs: z.int().nonnegative(),
});

export const metadataUpdateResultSchema = z.object({
  updatedDocuments: z.int().nonnegative(),
  updatedJobs: z.int().nonnegative(),
  skippedDocuments: z.int().nonnegative(),
  skippedJobs: z.int().nonnegative(),
});

export const metadataUpdateStatusSchema = z.object({
  runId: z.string(),
  status: z
    .string()
    .describe(
      "The background run status. COMPLETED indicates success; FAILED, CRASHED, SYSTEM_FAILURE, TIMED_OUT, EXPIRED, and CANCELED are terminal failures.",
    ),
  result: metadataUpdateResultSchema.nullable(),
});
