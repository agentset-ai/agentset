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
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        isDisabled ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600",
        className,
      )}
    >
      {isDisabled ? "Disabled" : "Enabled"}
    </span>
  );
}
