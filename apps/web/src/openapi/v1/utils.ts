import z from "zod/v4";

export const tenantHeaderSchema = z
  .string()
  .optional()
  .meta({
    description:
      "The tenant id to use for the request. If not provided, the default tenant will be used.",
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
