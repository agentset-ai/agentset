import { cn, Spinner } from "@agentset/ui";

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
