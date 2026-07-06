"use client";

import { useNamespace } from "@/hooks/use-namespace";
import { useOrganization } from "@/hooks/use-organization";
import { orpc } from "@/lib/orpc";
import { ORPCError } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@agentset/ui/skeleton";

import { HostingLayout } from "./components/hosting-layout";
import { EmptyState } from "./empty-state";

const isNotFoundError = (error: unknown) =>
  error instanceof ORPCError && error.code === "NOT_FOUND";

export default function HostingPageClient() {
  const namespace = useNamespace();
  const organization = useOrganization();
  const { data, isLoading, error } = useQuery(
    orpc.hosting.get.queryOptions({
      input: { namespaceId: namespace.id },
      context: { orgId: organization.id },
      select: (result) => result.data,
      retry: (count, error) => (isNotFoundError(error) ? false : count < 3),
    }),
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // hosting not enabled yet — the shared procedure 404s instead of returning null
  if (isNotFoundError(error)) {
    return <EmptyState />;
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <p className="text-muted-foreground text-sm">
          {error?.message ?? "Failed to load hosting settings."}
        </p>
      </div>
    );
  }

  return <HostingLayout data={data} />;
}

function LoadingSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-(--spacing(16))-(--spacing(20)))] flex-col gap-6">
      <Skeleton className="h-14 w-full" />
      <div className="flex flex-1 gap-8">
        <div className="flex flex-1 flex-col gap-4 lg:flex-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="hidden flex-4 lg:block">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
