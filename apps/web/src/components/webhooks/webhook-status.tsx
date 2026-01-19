import { cn } from "@agentset/ui/cn";

interface WebhookStatusProps {
  disabledAt: Date | null;
  className?: string;
}

export default function WebhookStatus({
  disabledAt,
  className,
}: WebhookStatusProps) {
  const isDisabled = !!disabledAt;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        isDisabled
          ? "bg-destructive/10 text-destructive"
          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        className,
      )}
    >
      {isDisabled ? "Disabled" : "Active"}
    </span>
  );
}
