import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

export function useWebhooks(organizationId: string) {
  const trpc = useTRPC();

  const { data, isLoading, error } = useQuery(
    trpc.webhook.list.queryOptions(
      { organizationId },
      {
        enabled: !!organizationId,
        staleTime: 60000, // 1 minute
      },
    ),
  );

  return {
    webhooks: data,
    isLoading,
    error,
  };
}
