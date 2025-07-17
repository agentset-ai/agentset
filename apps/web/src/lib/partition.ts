import { v4 as uuidv4 } from "uuid";

import type { Document, IngestJob, Namespace } from "@agentset/db";

import { presignGetUrl } from "./s3";

export interface PartitionBody {
  // one of url or text is required
  url?: string;
  text?: string;

  filename: string;
  extra_metadata?: Record<string, unknown>;
  batch_size?: number; // default to 5
  unstructured_args?: {
    overlap?: number;
    overlap_all?: boolean; // if true, overlap is applied to all chunks
    max_characters?: number; // hard chunk size
    new_after_n_chars?: number; // soft chunk size
    chunking_strategy?: "basic" | "by_title";
    strategy?: "auto" | "fast" | "hi_res" | "ocr_only";
    languages?: string[];
  };

  notify_id: string;
}

export const getPartitionDocumentBody = async (
  document: Document,
  ingestJob: IngestJob,
  namespace: Pick<Namespace, "id" | "embeddingConfig">,
) => {
  const body: Partial<PartitionBody> = {
    notify_id: `partition-${uuidv4()}`,
  };

  const type = document.source.type;
  switch (type) {
    case "TEXT": {
      body.text = document.source.text;
      // TODO: fix this later when we have a better way to handle extensions
      body.filename = `${document.id}.txt`;
      break;
    }
    case "FILE": {
      body.url = document.source.fileUrl;
      body.filename = document.name || document.id;
      break;
    }
    case "MANAGED_FILE": {
      const url = await presignGetUrl(document.source.key);
      body.url = url.url;
      body.filename = document.name || document.id;
      break;
    }

    default: {
      const exhaustiveCheck: never = type;
      throw new Error(`Unsupported document source type: ${exhaustiveCheck}`);
    }
  }

  const { metadata: ingestJobMetadata, ...ingestJobConfig } =
    ingestJob.config ?? {};
  const { metadata: documentMetadata, ...documentConfig } =
    document.config ?? {};

  body.extra_metadata = {
    ...(ingestJobMetadata ?? {}),
    ...(documentMetadata ?? {}), // document metadata overrides ingest job metadata
    ...(document.tenantId && { tenantId: document.tenantId }),
    namespaceId: namespace.id,
    documentId: document.id,
  };

  const unstructuredArgs: PartitionBody["unstructured_args"] = {};
  const mergedConfig = {
    ...ingestJobConfig,
    ...documentConfig,
  };

  // unstructuredArgs.overlap_all = true; // TODO: add this later
  if (mergedConfig.chunkOverlap)
    unstructuredArgs.overlap = mergedConfig.chunkOverlap;
  if (mergedConfig.chunkSize)
    unstructuredArgs.new_after_n_chars = mergedConfig.chunkSize;
  if (mergedConfig.maxChunkSize)
    unstructuredArgs.max_characters = mergedConfig.maxChunkSize;
  if (mergedConfig.chunkingStrategy)
    unstructuredArgs.chunking_strategy = mergedConfig.chunkingStrategy;
  if (mergedConfig.strategy) unstructuredArgs.strategy = mergedConfig.strategy;

  if (Object.keys(unstructuredArgs).length > 0)
    body.unstructured_args = unstructuredArgs;

  body.batch_size = 30;

  return body as PartitionBody;
};
