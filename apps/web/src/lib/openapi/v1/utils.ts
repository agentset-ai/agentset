import z from "zod/v4";

export const namespaceIdSchema = z.string().meta({
  examples: ["ns_123"],
  // description: "The id of the namespace (prefixed with ns_)",
});

export const documentIdPathSchema = z.string().meta({
  examples: ["doc_123"],
  // description: "The id of the document (prefixed with doc_)",
});

export const jobIdPathSchema = z.string().meta({
  examples: ["job_123"],
  // description: "The id of the job (prefixed with job_)",
});

export const namespaceIdRequestParamSchema = z.object({
  namespaceId: namespaceIdSchema,
});

export const documentIdRequestParamSchema = z.object({
  documentId: documentIdPathSchema,
});

export const jobIdRequestParamSchema = z.object({
  jobId: jobIdPathSchema,
});
