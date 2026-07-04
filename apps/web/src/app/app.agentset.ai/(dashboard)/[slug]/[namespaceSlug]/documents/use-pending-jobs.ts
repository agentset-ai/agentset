import { useNamespace } from "@/hooks/use-namespace";
import { orpc } from "@/lib/orpc";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { IngestJobStatus } from "@agentset/db/browser";

const PENDING_STATUSES: IngestJobStatus[] = [
  IngestJobStatus.BACKLOG,
  IngestJobStatus.QUEUED,
  IngestJobStatus.QUEUED_FOR_RESYNC,
  IngestJobStatus.QUEUED_FOR_DELETE,
  IngestJobStatus.PRE_PROCESSING,
  IngestJobStatus.PROCESSING,
  IngestJobStatus.DELETING,
  IngestJobStatus.CANCELLING,
];

export function useHasPendingJobs(enabled: boolean) {
  const namespace = useNamespace();
  const { data } = useQuery(
    orpc.ingestJob.all.queryOptions({
      input: {
        namespaceId: namespace.id,
        statuses: PENDING_STATUSES.join(","),
        perPage: 1,
      },
      enabled,
      refetchInterval: 15_000, // Refetch every 15 seconds
      placeholderData: keepPreviousData,
    }),
  );

  return data ? data.records.length > 0 : false;
}
