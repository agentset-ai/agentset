import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

export function useWebhooks(organizationId: string) {
  const { data, isLoading, error } = useQuery(
    orpc.webhook.listByOrg.queryOptions({
      input: { organizationId },
      enabled: !!organizationId,
      staleTime: 60000, // 1 minute
    }),
  );

  return {
    webhooks: data,
    isLoading,
    error,
  };
}
