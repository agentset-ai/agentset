"use client";

import { useParams } from "next/navigation";
import { useORPC } from "@/orpc/react";
import { useQuery } from "@tanstack/react-query";

import { useOrganization } from "./use-organization";

export function useNamespace() {
  const params = useParams();
  const slug = params.slug as string;
  const namespaceSlug = params.namespaceSlug as string;
  const orpc = useORPC();
  const org = useOrganization();

  const { data, isLoading, error } = useQuery(
    orpc.namespace.getNamespaceBySlug.queryOptions({
      input: {
        slug: namespaceSlug,
        orgSlug: slug,
      },
      enabled: !!slug && !!namespaceSlug,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }),
  );

  const isLoadingState = isLoading || !data || !!error || org.isLoading;

  return {
    isLoading: isLoadingState,
    error,
    /**
     * We do a null assertion here because when this hook is used inside <DashboardPageWrapper>
     * it's guaranteed that the namespace is loaded.
     *
     * However, in places outside of it, we need to check for loading state ourselves (like the sidebar).
     */
    ...data!,
    organization: org!,
    baseUrl: org.slug && data ? `/${org.slug}/${data.slug}` : undefined,
  } as const;
}
