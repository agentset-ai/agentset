import type { Document, IngestJob } from "@agentset/db";
import { presignChunksUploadUrl, presignGetUrl } from "@agentset/storage";

import type { ChunkOptions, ParseOptions, PartitionBody } from "./types";

export * from "./types";

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
    trigger_token_id: triggerTokenId,
    trigger_access_token: triggerAccessToken,
    namespace_id: namespaceId,
    document_id: document.id,
    batch_size: 30,
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

  const mergedConfig = {
    ...ingestJobConfig,
    ...documentConfig,
  };

  const chunkOptions: ChunkOptions = {};
  chunkOptions.chunk_size = mergedConfig.chunkSize;
  chunkOptions.language_code = mergedConfig.languageCode;

  const parseOptions: ParseOptions = {};
  parseOptions.force_ocr = mergedConfig.forceOcr;
  parseOptions.disable_image_extraction = mergedConfig.disableImageExtraction;
  parseOptions.disable_ocr_math = mergedConfig.disableOcrMath;
  parseOptions.use_llm = mergedConfig.useLlm;
  parseOptions.mode = mergedConfig.mode;

  // if (mergedConfig.maxChunkSize)
  //   chunkOptions.min_sentences_per_chunk = mergedConfig.maxChunkSize;
  // if (mergedConfig.chunkingStrategy)
  //   unstructuredArgs.chunking_strategy = mergedConfig.chunkingStrategy;
  // if (mergedConfig.strategy) unstructuredArgs.strategy = mergedConfig.strategy;

  if (Object.keys(chunkOptions).length > 0) body.chunk_options = chunkOptions;

  body.upload_presigned_url = await presignChunksUploadUrl(
    namespaceId,
    document.id,
  );

  return body as PartitionBody;
};
