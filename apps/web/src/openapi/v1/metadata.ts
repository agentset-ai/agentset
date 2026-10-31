import type {
  ZodOpenApiOperationObject,
  ZodOpenApiPathsObject,
} from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import {
  metadataUpdateAcceptedSchema,
  metadataUpdateStatusSchema,
  updateMetadataSchema,
} from "@/schemas/api/metadata";
import { z } from "zod/v4";

import { namespaceIdPathSchema, tenantHeaderSchema } from "./utils";

const updateOperation = (
  target: "documents" | "ingest-jobs",
): ZodOpenApiOperationObject => ({
  operationId:
    target === "documents"
      ? "updateDocumentsMetadata"
      : "updateIngestJobsMetadata",
  "x-speakeasy-name-override": "updateMetadata",
  ...(target === "ingest-jobs" && { "x-speakeasy-group": "ingestJobs" }),
  summary:
    target === "documents"
      ? "Update document metadata by filter"
      : "Update ingest job metadata by filter",
  description:
    "Merge metadata into matching records and their search chunks without re-ingesting. Selection is fixed when requested and scoped to the namespace and x-tenant-id (omitting the header selects only records without a tenant). At most 1,000 documents and 1,000 jobs may match. Matching documents and their parent jobs must be COMPLETED, FAILED, or CANCELLED. Job updates preserve explicit document metadata overrides. Updates run asynchronously and may be partially applied until retries complete. Poll the returned run ID for completion.",
  parameters: [namespaceIdPathSchema, tenantHeaderSchema],
  requestBody: {
    required: true,
    content: { "application/json": { schema: updateMetadataSchema } },
  },
  responses: {
    "200": {
      description: "No records matched; no update was queued.",
      content: {
        "application/json": {
          schema: successSchema(metadataUpdateAcceptedSchema),
        },
      },
    },
    "202": {
      description:
        "The update was queued. Match counts are not completion counts.",
      content: {
        "application/json": {
          schema: successSchema(metadataUpdateAcceptedSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: [target === "documents" ? "Documents" : "Ingest Jobs"],
  security: [{ token: [] }],
});

export const metadataPaths: ZodOpenApiPathsObject = {
  "/v1/namespace/{namespaceId}/documents/metadata": {
    patch: updateOperation("documents"),
  },
  "/v1/namespace/{namespaceId}/ingest-jobs/metadata": {
    patch: updateOperation("ingest-jobs"),
  },
  "/v1/namespace/{namespaceId}/metadata-updates/{runId}": {
    get: {
      operationId: "getMetadataUpdate",
      "x-speakeasy-group": "metadataUpdates",
      "x-speakeasy-name-override": "get",
      summary: "Get metadata update status",
      description:
        "Retrieve update status in the same namespace and tenant used to submit it. COMPLETED indicates the database, index, and available chunk downloads have been updated. Deleted records are counted as skipped. A failed run may have applied some updates; repeating the same merge is safe.",
      parameters: [namespaceIdPathSchema, tenantHeaderSchema],
      requestParams: {
        path: z.object({
          runId: z.string().describe("The metadata update run ID."),
        }),
      },
      responses: {
        "200": {
          description: "The update status and completion result.",
          content: {
            "application/json": {
              schema: successSchema(metadataUpdateStatusSchema),
            },
          },
        },
        ...openApiErrorResponses,
      },
      tags: ["Metadata Updates"],
      security: [{ token: [] }],
    },
  },
};
