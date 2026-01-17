import { useState } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { useTRPC } from "@/trpc/react";
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

export type JobsStatus =
  | { type: "idle" }
  | { type: "processing" }
  | { type: "error"; jobId: string; jobName: string | null; error: string };

export function useJobsStatus(enabled: boolean) {
  const namespace = useNamespace();
  const trpc = useTRPC();
  const [dismissedErrorJobId, setDismissedErrorJobId] = useState<string | null>(
    null,
  );
  // Track when the hook was mounted to only show errors for jobs that failed after
  const [mountedAt] = useState(() => new Date());

  // Check for pending jobs - use dynamic refetch interval based on results
  const { data: pendingData } = useQuery(
    trpc.ingestJob.all.queryOptions(
      {
        namespaceId: namespace.id,
        statuses: PENDING_STATUSES.join(","),
        perPage: 1,
      },
      {
        enabled,
        placeholderData: keepPreviousData,
        refetchInterval: (query) => {
          const hasPending = (query.state.data?.records.length ?? 0) > 0;
          return hasPending ? 5_000 : 15_000;
        },
      },
    ),
  );

  const hasPendingJobs = pendingData ? pendingData.records.length > 0 : false;

  // Check for recently failed jobs - use same dynamic interval
  const { data: failedData } = useQuery(
    trpc.ingestJob.all.queryOptions(
      {
        namespaceId: namespace.id,
        statuses: IngestJobStatus.FAILED,
        perPage: 1,
        order: "desc",
      },
      {
        enabled,
        placeholderData: keepPreviousData,
        refetchInterval: hasPendingJobs ? 5_000 : 15_000,
      },
    ),
  );
  const failedJob = failedData?.records[0];

  // Determine the status to show
  const getStatus = (): JobsStatus => {
    // If there's a failed job that hasn't been dismissed and failed after mount, show error
    const failedAfterMount =
      failedJob?.failedAt && failedJob.failedAt > mountedAt;
    if (
      failedJob &&
      failedAfterMount &&
      failedJob.id !== dismissedErrorJobId &&
      failedJob.error
    ) {
      return {
        type: "error",
        jobId: failedJob.id,
        jobName: failedJob.name,
        error: failedJob.error,
      };
    }

    // If there are pending jobs, show processing
    if (hasPendingJobs) {
      return { type: "processing" };
    }

    return { type: "idle" };
  };

  const dismissError = () => {
    if (failedJob) {
      setDismissedErrorJobId(failedJob.id);
    }
  };

  return {
    status: getStatus(),
    dismissError,
  };
}

// Keep the old hook for backward compatibility if needed elsewhere
export function useHasPendingJobs(enabled: boolean) {
  const namespace = useNamespace();
  const trpc = useTRPC();
  const { data } = useQuery(
    trpc.ingestJob.all.queryOptions(
      {
        namespaceId: namespace.id,
        statuses: PENDING_STATUSES.join(","),
        perPage: 1,
      },
      {
        enabled,
        refetchInterval: 15_000,
        placeholderData: keepPreviousData,
      },
    ),
  );

  return data ? data.records.length > 0 : false;
}
