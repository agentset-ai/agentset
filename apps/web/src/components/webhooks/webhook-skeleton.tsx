import { Skeleton } from "@agentset/ui/skeleton";

export default function WebhookSkeleton() {
  return (
    <div className="relative rounded-xl border px-5 py-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  );
}
