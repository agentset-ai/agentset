import { z } from "zod/v4";

const tenantIdRegex = /^[A-Za-z0-9]{1,64}$/;

/**
 * The optional `x-tenant-id` request header. In the OpenAPI document it is
 * published as the shared `#/components/parameters/TenantIdRef` component
 * (see `@/server/orpc/spec`).
 */
export const tenantHeaderSchema = z
  .string()
  .regex(tenantIdRegex)
  .optional()
  .meta({
    description:
      "Optional tenant id to use for the request. If not provided, the namespace will be used directly. Must be alphanumeric and up to 64 characters.",
  });

/**
 * Path-parameter schemas shared by the public v1 procedures. The generated
 * inline parameters are swapped for `#/components/parameters/*Ref` component
 * references by the spec post-processing (see `@/server/orpc/spec`).
 */
export const namespaceIdPathSchema = z.string().meta({
  examples: ["ns_123"],
  description: "The id of the namespace (prefixed with ns_)",
});

export const documentIdPathSchema = z.string().meta({
  examples: ["doc_123"],
  description: "The id of the document (prefixed with doc_)",
});

export const jobIdPathSchema = z.string().meta({
  examples: ["job_123"],
  description: "The id of the job (prefixed with job_)",
});
