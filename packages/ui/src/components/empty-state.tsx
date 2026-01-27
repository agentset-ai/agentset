import { cn } from "../lib/utils";

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[180px] flex-col items-center justify-center",
        className,
      )}
    >
      {Icon && <Icon className="text-muted-foreground mb-4 size-10" />}
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
