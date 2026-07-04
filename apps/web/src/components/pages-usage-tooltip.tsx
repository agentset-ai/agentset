"use client";

import { useMemo } from "react";
import { formatNumber } from "@/lib/utils";

import { TooltipContent } from "@agentset/ui/tooltip";

/**
 * The next date the usage cron releases deleted pages: the next occurrence of
 * the billing-cycle start day, clamped to the last day of short months
 * (mirrors getAdjustedBillingCycleStart). Computed in UTC because the cron
 * compares day-of-month in the worker's (UTC) timezone.
 *
 * Returns "today" when the reset day is today, or null while loading.
 */
export function useNextCycleResetDate({
  billingCycleStart,
  createdAt,
  enabled = true,
}: {
  billingCycleStart?: number | null;
  createdAt?: Date | string;
  enabled?: boolean;
}) {
  return useMemo(() => {
    if (!enabled) return null;

    // organizations that never subscribed don't have a billingCycleStart,
    // their cycle is anchored to the (UTC) day they were created
    const cycleStart =
      billingCycleStart ??
      (createdAt ? new Date(createdAt).getUTCDate() : undefined);
    if (!cycleStart) return null;

    const daysInMonth = (year: number, month: number) =>
      new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    const now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth();
    const today = Date.UTC(year, month, now.getUTCDate());

    let reset = Date.UTC(
      year,
      month,
      Math.min(cycleStart, daysInMonth(year, month)),
    );
    if (reset < today) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      reset = Date.UTC(
        year,
        month,
        Math.min(cycleStart, daysInMonth(year, month)),
      );
    }

    if (reset === today) return "today";
    return new Date(reset).toLocaleDateString("en-us", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }, [enabled, billingCycleStart, createdAt]);
}

export function formatResetDate(nextResetDate: string | null) {
  if (!nextResetDate) return "next cycle";
  return nextResetDate === "today" ? "today" : `on ${nextResetDate}`;
}

export function PagesUsageTooltipContent({
  activePages,
  deletedPages,
  nextResetDate,
  ...props
}: {
  activePages: number;
  deletedPages: number;
  nextResetDate: string | null;
} & React.ComponentProps<typeof TooltipContent>) {
  const totalPages = activePages + deletedPages;

  return (
    <TooltipContent side="top" className="w-60" {...props}>
      <div className="flex flex-col gap-1.5 py-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="bg-background size-2 shrink-0 rounded-full" />
            Active pages
          </span>
          <span className="tabular-nums">
            {formatNumber(activePages, "decimal")}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full bg-red-400" />
            Deleted pages
          </span>
          <span className="tabular-nums">
            {formatNumber(deletedPages, "decimal")}
          </span>
        </div>

        <div className="border-background/20 flex items-center justify-between gap-4 border-t pt-1.5">
          <span>Total counted</span>
          <span className="tabular-nums">
            {formatNumber(totalPages, "decimal")}
          </span>
        </div>

        <p className="text-background/70 mt-0.5 text-pretty">
          Deleted pages free up {formatResetDate(nextResetDate)}.
        </p>
      </div>
    </TooltipContent>
  );
}
