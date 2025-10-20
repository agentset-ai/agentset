import { cn } from "@agentset/ui/cn";
import { Spinner } from "@agentset/ui/spinner";

export default function LayoutLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-[calc(100vh-16px)] items-center justify-center",
        className,
      )}
    >
      <Spinner />
    </div>
  );
}
