import { useState } from "react";
import { useCursorPagination } from "@/hooks/use-cursor-pagination";
import { useNamespace } from "@/hooks/use-namespace";
import { useTRPC } from "@/trpc/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { DocumentStatus } from "@agentset/db/browser";
import { capitalize } from "@agentset/utils";

const statusLabels = Object.values(DocumentStatus).map((status) => ({
  label: capitalize(status.split("_").join(" ")) as string,
  value: status,
}));

export function useDocuments(jobId?: string, enabled = true) {
  const namespace = useNamespace();
  const trpc = useTRPC();
  const [statuses, _setStatuses] = useState<DocumentStatus[]>([]);
  const {
    cursor,
    cursorDirection,
    handleNext,
    handlePrevious,
    hasPrevious,
    reset,
  } = useCursorPagination();

  const { isLoading, data, refetch, isFetching } = useQuery(
    trpc.document.all.queryOptions(
      {
        namespaceId: namespace.id,
        ingestJobId: jobId,
        statuses: statuses.length > 0 ? statuses.join(",") : undefined,
        cursor,
        cursorDirection,
      },
      {
        placeholderData: keepPreviousData,
        enabled,
      },
    ),
  );

  const setStatuses = (statuses: DocumentStatus[]) => {
    _setStatuses(statuses);
    reset();
  };

  return {
    isLoading,
    isFetching,
    data,
    refetch,
    cursor,
    cursorDirection,
    handleNext,
    handlePrevious,
    hasPrevious,
    statuses,
    setStatuses,
    statusLabels,
  };
}
