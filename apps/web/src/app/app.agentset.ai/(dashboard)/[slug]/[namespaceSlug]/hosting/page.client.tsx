"use client";

import { useNamespace } from "@/hooks/use-namespace";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@agentset/ui/skeleton";

import { HostingLayout } from "./components/hosting-layout";
import { EmptyState } from "./empty-state";

export default function HostingPageClient() {
  const namespace = useNamespace();
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.hosting.get.queryOptions({
      namespaceId: namespace.id,
    }),
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return <EmptyState />;
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
