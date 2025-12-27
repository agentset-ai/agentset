import { SAMPLE_DATA_CONFIGS } from "@/components/create-first-namespace/sample-data-config";
import { createIngestJob } from "@/services/ingest-jobs/create";

export async function ingestSampleData({
  namespaceId,
  sampleDataTypeId,
  plan,
}: {
  namespaceId: string;
  sampleDataTypeId: string;
  plan: string;
}) {
  const config = SAMPLE_DATA_CONFIGS[sampleDataTypeId];
  if (!config) {
    throw new Error("INVALID_SAMPLE_DATA_TYPE");
  }

  const jobs = await Promise.all(
    config.files.map((file) =>
      createIngestJob({
        namespaceId,
        plan,
        data: {
          name: file.name,
          payload: {
            type: "FILE" as const,
            fileUrl: file.fileUrl,
            fileName: file.fileName,
          },
          config: {
            metadata: file.metadata,
          },
          externalId: null,
        },
      }),
    ),
  );

  return jobs;
}
