import type { Document, IngestJob } from "@agentset/db";
import { presignGetUrl } from "@agentset/storage";

import type { ChunkOptions, ParseOptions, PartitionBody } from "./types";

export * from "./types";

const filterUndefined = <T extends object>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined),
  ) as T;
};

type DocumentToPartition = Pick<
  Document,
  "id" | "name" | "config" | "tenantId"
> & {
  source: Exclude<
    Document["source"],
    { type: "CRAWLED_PAGE" } | { type: "YOUTUBE_VIDEO" }
  >;
};

export const getPartitionDocumentBody = async ({
  document,
  ingestJobConfig: _ingestJobConfig,
  namespaceId,
  triggerTokenId,
  triggerAccessToken,
}: {
  document: DocumentToPartition;
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
      if (document.name) body.filename = document.name;
      break;
    }

    case "MANAGED_FILE": {
      const url = await presignGetUrl(document.source.key);
      body.url = url.url;
      if (document.name) body.filename = document.name;
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
    ...(document.name && { filename: document.name }),
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

  const chunkOptions: ChunkOptions = filterUndefined({
    chunk_size: mergedConfig.chunkSize,
    language_code: mergedConfig.languageCode,
  });

  const parseOptions: ParseOptions = filterUndefined({
    force_ocr: mergedConfig.forceOcr,
    disable_image_extraction: mergedConfig.disableImageExtraction,
    disable_ocr_math: mergedConfig.disableOcrMath,
    use_llm: mergedConfig.useLlm,
    mode: mergedConfig.mode,
  });

  if (Object.keys(chunkOptions).length > 0) body.chunk_options = chunkOptions;
  if (Object.keys(parseOptions).length > 0) body.parse_options = parseOptions;

  return body as PartitionBody;
};
