// import { v4 as uuidv4 } from "uuid";
import type { Document, IngestJob, Namespace } from "@agentset/db";
import { presignGetUrl } from "@agentset/storage";

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

  notify_id?: string;
  trigger_token_id?: string;
  trigger_access_token?: string;
}

export type PartitionResult = {
  status: number; // 200
  metadata: {
    filename: string;
    filetype: string;
    sizeInBytes: number;
  };
  total_characters: number;
  total_chunks: number;
  total_pages?: number;
  total_batches: number;
  results_id: string;
  batch_template: string; // replace [BATCH_INDEX] with batch index
  // total_tokens: number;
};

export type PartitionBatch = {
  id_: string;
  embedding: null;
  metadata: {
    link_texts?: string[];
    link_urls?: string[];
    languages?: string[];
    filename: string;
    filetype: string;
    sequence_number: number;
  };
  excluded_embed_metadata_keys: string[];
  excluded_llm_metadata_keys: string[];
  relationships: Record<
    string,
    {
      node_id: string;
      node_type: string;
      metadata: {
        link_texts?: string[];
        link_urls?: string[];
        languages?: string[];
        filename?: string;
        filetype?: string;
      };
      hash: string;
      class_name: string;
    }
  >;
  metadata_template: string;
  metadata_separator: string;
  text: string;
  mimetype: string;
  start_char_idx: number | null;
  end_char_idx: number | null;
  metadata_seperator: string;
  text_template: string;
  class_name: string;
}[];

export const getPartitionDocumentBody = async ({
  document,
  ingestJobConfig: _ingestJobConfig,
  namespaceId,
  triggerTokenId,
  triggerAccessToken,
}: {
  document: Pick<Document, "id" | "name" | "source" | "config" | "tenantId">;
  ingestJobConfig: IngestJob["config"];
  namespaceId: string;
  triggerTokenId: string;
  triggerAccessToken: string;
}) => {
  const body: Partial<PartitionBody> = {
    // notify_id: `partition-${uuidv4()}`,
    trigger_token_id: triggerTokenId,
    trigger_access_token: triggerAccessToken,
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
    _ingestJobConfig ?? {};
  const { metadata: documentMetadata, ...documentConfig } =
    document.config ?? {};

  body.extra_metadata = {
    ...(ingestJobMetadata ?? {}),
    ...(documentMetadata ?? {}), // document metadata overrides ingest job metadata
    ...(document.tenantId && { tenantId: document.tenantId }),
    namespaceId,
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
