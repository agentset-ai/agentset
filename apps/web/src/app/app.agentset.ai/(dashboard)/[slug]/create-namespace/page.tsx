"use client";

import CreateNamespaceDialog from "@/components/create-namespace";
import { useOrganization } from "@/hooks/use-organization";

import { Skeleton } from "@agentset/ui/skeleton";

export default function CreateNamespacePage() {
  const organization = useOrganization();

  if (organization.isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-2xl rounded-lg bg-white p-6">
          <Skeleton className="mb-4 h-6 w-48" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="flex justify-end gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CreateNamespaceDialog
      organization={organization}
      open
      setOpen={() => {}}
    />
  );
}
