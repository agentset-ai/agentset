"use client";

import { useState } from "react";
import Link from "next/link";
import CreateNamespaceDialog from "@/components/create-namespace";
import { useOrganization } from "@/contexts/organization-context";
import { formatNumber } from "@/lib/utils";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { FoldersIcon, PlusIcon } from "lucide-react";

import {
  Button,
  DataWrapper,
  EmptyState,
  Separator,
  Skeleton,
} from "@agentset/ui";

export default function DashboardPage() {
  const { activeOrganization } = useOrganization();
  const [open, setOpen] = useState(false);

  const trpc = useTRPC();
  const {
    data: namespaces,
    isLoading,
    error,
  } = useQuery(
    trpc.namespace.getOrgNamespaces.queryOptions({
      orgId: activeOrganization.id,
    }),
  );

  const createButton = (
    <Button onClick={() => setOpen(true)}>
      <PlusIcon className="size-4" />
      New Namespace
    </Button>
  );

  return (
    <>
      <CreateNamespaceDialog
        organization={activeOrganization}
        open={open}
        setOpen={setOpen}
      />

      <DataWrapper
        data={namespaces}
        isLoading={isLoading}
        error={error}
        loadingState={
          <div>
            <div className="mb-5 flex justify-end">
              <Skeleton className="bg-muted h-9 w-40 max-w-full animate-pulse rounded-md" />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="bg-muted h-40 animate-pulse rounded-lg"
                />
              ))}
            </div>
          </div>
        }
        emptyState={
          <EmptyState
            className="mt-20"
            title="No namespaces"
            description="Create a new namespace to start uploading your data"
            icon={FoldersIcon}
            action={createButton}
          />
        }
      >
        {(namespaces) => (
          <div>
            <div className="mb-5 flex justify-end">{createButton}</div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {namespaces.map((namespace) => {
                const didNotFinishOnboarding =
                  namespace.totalPlaygroundUsage === 0;
                return (
                  <Link
                    key={namespace.id}
                    href={`/${activeOrganization.slug}/${namespace.slug}${didNotFinishOnboarding ? "/quick-start" : ""}`}
                    className="border-border hover:bg-muted min-h-30 rounded-md border p-6 transition-colors"
                  >
                    <p className="font-medium">{namespace.name}</p>
                    <div className="text-muted-foreground mt-5 flex flex-wrap items-center gap-2 text-sm">
                      <p>
                        {formatNumber(namespace.totalPages, "compact")} pages
                      </p>
                      <Separator
                        orientation="vertical"
                        className="!h-4 shrink-0"
                      />
                      <p>
                        {formatNumber(namespace.totalDocuments, "compact")}{" "}
                        documents
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </DataWrapper>
    </>
  );
}
