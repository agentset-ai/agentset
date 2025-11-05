"use client";

import { useNamespace } from "@/hooks/use-namespace";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

import { Separator } from "@agentset/ui/separator";
import { Skeleton } from "@agentset/ui/skeleton";

import { CustomDomainConfigurator } from "./domain-card";
import { EmptyState } from "./empty-state";
import HostingForm from "./form";

export default function HostingPage() {
  const namespace = useNamespace();
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.hosting.get.queryOptions({
      namespaceId: namespace.id,
    }),
  );

  if (isLoading) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
      </div>
    );
  }

  if (!data) {
    return <EmptyState />;
  }

  return (
    <div className="max-w-xl">
      <HostingForm data={data} />

      <Separator className="my-10" />

      <CustomDomainConfigurator defaultDomain={data.domain?.slug} />
    </div>
  );
}
