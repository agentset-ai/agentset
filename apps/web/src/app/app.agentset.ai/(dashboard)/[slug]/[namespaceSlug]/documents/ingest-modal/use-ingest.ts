import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";

import { IngestJobConfig, IngestJobPayload } from "@agentset/validation";

interface UseIngestOptions {
  type: IngestJobPayload["type"];
  onSuccess: () => void;
  extraAnalytics?: (values: unknown) => Record<string, unknown>;
}

/**
 * Build analytics event data from config
 */
function buildAnalyticsData(
  type: IngestJobPayload["type"],
  namespaceId: string,
  config?: IngestJobConfig | null,
  extra?: Record<string, unknown>,
) {
  return {
    type,
    namespaceId,
    chunkSize: config?.chunkSize,
    languageCode: config?.languageCode,
    forceOcr: config?.forceOcr,
    mode: config?.mode,
    disableImageExtraction: config?.disableImageExtraction,
    disableOcrMath: config?.disableOcrMath,
    useLlm: config?.useLlm,
    hasMetadata: !!config?.metadata,
    ...extra,
  };
}

export function useIngest({
  type,
  onSuccess,
  extraAnalytics,
}: UseIngestOptions) {
  const namespace = useNamespace();
  const trpc = useTRPC();

  const mutation = useMutation(
    trpc.ingestJob.ingest.mutationOptions({
      onSuccess: (doc) => {
        logEvent(
          "document_ingested",
          buildAnalyticsData(
            type,
            namespace.id,
            doc.config,
            extraAnalytics?.(doc),
          ),
        );
        onSuccess();
      },
    }),
  );

  return {
    ...mutation,
    namespace,
  };
}
