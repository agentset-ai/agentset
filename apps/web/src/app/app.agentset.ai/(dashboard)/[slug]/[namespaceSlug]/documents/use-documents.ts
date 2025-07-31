import { useState } from "react";
import { useNamespace } from "@/contexts/namespace-context";
import { useCursorPagination } from "@/hooks/use-cursor-pagination";
import { capitalize } from "@/lib/string-utils";
import { useTRPC } from "@/trpc/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { DocumentStatus } from "@agentset/db";

const statusLabels = Object.values(DocumentStatus).map((status) => ({
  label: capitalize(status.split("_").join(" ")) as string,
  value: status,
}));

export function useDocuments(jobId?: string, enabled = true) {
  const { activeNamespace } = useNamespace();
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
        namespaceId: activeNamespace.id,
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
