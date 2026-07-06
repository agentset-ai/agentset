import { useNamespace } from "@/hooks/use-namespace";
import { useOrganization } from "@/hooks/use-organization";
import { logEvent } from "@/lib/analytics";
import { orpc } from "@/lib/orpc";
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
    mode: config?.mode,
    disableImageExtraction: config?.disableImageExtraction,
    disableImageCaptions: config?.disableImageCaptions,
    keepPagefooterInOutput: config?.keepPagefooterInOutput,
    keepPageheaderInOutput: config?.keepPageheaderInOutput,
    chartUnderstanding: config?.chartUnderstanding,
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
  const organization = useOrganization();

  const mutation = useMutation(
    orpc.ingestJob.create.mutationOptions({
      context: { orgId: organization.id },
      onSuccess: (res) => {
        const job = res.data;
        logEvent(
          "document_ingested",
          buildAnalyticsData(
            type,
            namespace.id,
            job.config,
            extraAnalytics?.(job),
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
