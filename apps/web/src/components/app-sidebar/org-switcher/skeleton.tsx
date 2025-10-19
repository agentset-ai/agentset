import { Skeleton } from "@agentset/ui/skeleton";

export function OrganizationSwitcherSkeleton() {
  return (
    <div className="flex h-12 items-center pl-2">
      <div className="flex w-full items-center gap-2">
        <Skeleton className="size-8 rounded-sm" />
        <div className="grid flex-1 gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="ml-2 size-8" />
    </div>
  );
}
