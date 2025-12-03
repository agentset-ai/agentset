import { useParams } from "next/navigation";
import { useORPC } from "@/orpc/react";
import { useQuery } from "@tanstack/react-query";

export function useOrganization() {
  const params = useParams();
  const slug = params.slug as string;

  const orpc = useORPC();
  const { data, isLoading, error } = useQuery(
    orpc.organization.getBySlug.queryOptions({
      input: { slug },
      enabled: !!slug,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }),
  );

  return {
    /**
     * We do a null assertion here because when this hook is used inside <DashboardPageWrapper>
     * it's guaranteed that the namespace is loaded.
     *
     * However, in places outside of it, we need to check for loading state ourselves (like the sidebar).
     */
    ...data!,
    isLoading: isLoading || !data || !!error,
    error,
  };
}
