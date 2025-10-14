import z from "zod/v4";

const tenantIdRegex = /^[A-Za-z0-9]{1,64}$/;
export const tenantHeaderSchema = z
  .string()
  .regex(tenantIdRegex)
  .optional()
  .meta({
    description:
      "Optional tenant id to use for the request. If not provided, the namespace will be used directly. Must be alphanumeric and up to 64 characters.",
    param: {
      in: "header",
      name: "x-tenant-id",
      id: "TenantIdRef",
    },
  });

export const namespaceIdPathSchema = z.string().meta({
  examples: ["ns_123"],
  description: "The id of the namespace (prefixed with ns_)",
  param: {
    in: "path",
    name: "namespaceId",
    id: "NamespaceIdRef",
    "x-speakeasy-globals-hidden": true,
  },
});

export const documentIdPathSchema = z.string().meta({
  examples: ["doc_123"],
  param: {
    in: "path",
    name: "documentId",
    id: "DocumentIdRef",
  },
  description: "The id of the document (prefixed with doc_)",
});

export const jobIdPathSchema = z.string().meta({
  examples: ["job_123"],
  description: "The id of the job (prefixed with job_)",
  param: {
    in: "path",
    name: "jobId",
    id: "JobIdRef",
  },
});
