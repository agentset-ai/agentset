"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateFirstNamespace } from "@/components/create-first-namespace";
import CreateNamespaceDialog from "@/components/create-namespace";
import { useOrganization } from "@/hooks/use-organization";
import { useSession } from "@/hooks/use-session";
import { formatNumber } from "@/lib/utils";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { DataWrapper } from "@agentset/ui/data-wrapper";
import { Separator } from "@agentset/ui/separator";
import { Skeleton } from "@agentset/ui/skeleton";
import { capitalize } from "@agentset/utils";

export default function DashboardPage() {
  const organization = useOrganization();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [dialogDefaultName, setDialogDefaultName] = useState("");

  const trpc = useTRPC();

  const rawUserName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "User";
  const userName = capitalize(rawUserName)!;

  const {
    data: namespaces,
    isLoading,
    error,
  } = useQuery(
    trpc.namespace.getOrgNamespaces.queryOptions({
      slug: organization.slug,
    }),
  );

  if (organization.isLoading) {
    return (
      <div className="flex h-full flex-col space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-40" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Separator />
        <div>
          <div className="mb-5 flex justify-end">
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleOpenDialog = (name?: string) => {
    setDialogDefaultName(
      name || (namespaces ? `Namespace ${namespaces.length + 1}` : "Namespace"),
    );
    setOpen(true);
  };

  const createButton = (
    <Button onClick={() => handleOpenDialog()}>
      <PlusIcon className="size-4" />
      New Namespace
    </Button>
  );

  return (
    <>
      <CreateNamespaceDialog
        organization={organization}
        open={open}
        setOpen={setOpen}
        defaultName={dialogDefaultName}
      />

      <DataWrapper
        data={namespaces}
        isLoading={isLoading}
        error={error}
        loadingState={
          <div>
            <div className="mb-5 flex justify-end">
              <Skeleton className="h-9 w-40" />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-40" />
              ))}
            </div>
          </div>
        }
        emptyState={
          <CreateFirstNamespace
            organization={{
              id: organization.id,
              slug: organization.slug,
              name: organization.name,
            }}
            onOpenDialog={handleOpenDialog}
            userName={userName}
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
                    href={`/${organization.slug}/${namespace.slug}${didNotFinishOnboarding ? "/quick-start" : ""}`}
                    className="border-border hover:bg-muted min-h-30 rounded-md border p-6 transition-colors"
                  >
                    <p className="font-medium">{namespace.name}</p>
                    <div className="text-muted-foreground mt-5 flex flex-wrap items-center gap-2 text-sm">
                      <p>
                        {formatNumber(namespace.totalPages, "compact")} pages
                      </p>
                      <Separator
                        orientation="vertical"
                        className="h-4! shrink-0"
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
