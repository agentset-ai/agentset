import { AgentsetApiError } from "@/lib/api/errors";

import { DocumentStatus } from "@agentset/db";
import { presignChunksDownloadUrl, presignGetUrl } from "@agentset/storage";

import { getDocumentOrThrow } from "./get";

export const getDocumentChunksDownloadUrl = async ({
  namespaceId,
  documentId,
  tenantId,
}: {
  namespaceId: string;
  documentId: string;
  tenantId?: string;
}) => {
  const document = await getDocumentOrThrow({
    namespaceId,
    documentId,
    tenantId,
  });

  if (document.status !== DocumentStatus.COMPLETED) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Chunks are only available for completed documents",
    });
  }

  const url = await presignChunksDownloadUrl(namespaceId, document.id);
  if (!url) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Chunks file not found",
    });
  }

  return { url };
};

export const getDocumentFileDownloadUrl = async ({
  namespaceId,
  documentId,
  tenantId,
}: {
  namespaceId: string;
  documentId: string;
  tenantId?: string;
}) => {
  const document = await getDocumentOrThrow({
    namespaceId,
    documentId,
    tenantId,
  });

  if (document.source.type !== "MANAGED_FILE") {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "File download is only available for managed files",
    });
  }

  const { url } = await presignGetUrl(document.source.key, {
    fileName: document.name ?? undefined,
  });

  return { url };
};
