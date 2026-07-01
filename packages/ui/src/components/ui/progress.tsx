"use client";

import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@agentset/ui/cn";

interface ProgressSegment {
  value: number;
  className?: string;
}

function Progress({
  className,
  value,
  segments,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  /**
   * When provided, renders one colored indicator per segment (side by side)
   * instead of the single primary indicator. Values are percentages.
   */
  segments?: ProgressSegment[];
}) {
  const totalValue =
    value ?? segments?.reduce((acc, segment) => acc + segment.value, 0);

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      // clamp: radix logs an error and goes indeterminate for values
      // outside [0, 100] (e.g. usage over the limit)
      value={
        totalValue != null && Number.isFinite(totalValue)
          ? Math.min(100, Math.max(0, totalValue))
          : undefined
      }
      className={cn(
        "bg-muted relative flex h-1 w-full items-center overflow-x-hidden rounded-full",
        className,
      )}
      {...props}
    >
      {segments ? (
        segments.map((segment, index) => (
          <ProgressPrimitive.Indicator
            key={index}
            data-slot="progress-indicator"
            className={cn(
              "bg-primary h-full shrink-0 transition-all",
              segment.className,
            )}
            style={{ width: `${Math.min(100, Math.max(0, segment.value))}%` }}
          />
        ))
      ) : (
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="bg-primary size-full flex-1 transition-all"
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      )}
    </ProgressPrimitive.Root>
  );
}

export { Progress };
