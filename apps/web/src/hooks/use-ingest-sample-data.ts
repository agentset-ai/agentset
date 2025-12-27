import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";

export function useIngestSampleData() {
  const trpc = useTRPC();

  return useMutation(
    trpc.ingestJob.ingestSampleData.mutationOptions({
      onSuccess: (data, variables) => {
        logEvent("sample_data_ingested", {
          sampleDataTypeId: variables.sampleDataTypeId,
          namespaceId: variables.namespaceId,
          ingestJobIds: data.map((job) => job.id),
          totalJobs: data.length,
        });
      },
      onError: (error) => {
        // Log but don't show toast - we handle this in the component
        // The namespace was created successfully, ingestion can be retried from dashboard
        console.error("Failed to ingest sample data:", error);
      },
    }),
  );
}
