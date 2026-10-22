"use client";

import { useMemo } from "react";
import { formatNumber } from "@/lib/utils";

import { TooltipContent } from "@agentset/ui/tooltip";

/**
 * When the deleted pages are released: the end of the organization's stored
 * usage period, which is exactly when the backend rolls it over. Dates are
 * shown in UTC, like the periods themselves.
 *
 * Returns "today" when the period ends today, "soon" when it has ended but
 * the rollover hasn't run yet, or null before the period is known.
 */
export function getNextCycleResetDate(
  billingPeriodEnd: Date | string | null | undefined,
  now = new Date(),
) {
  if (!billingPeriodEnd) return null;

  const end = new Date(billingPeriodEnd);
  if (end <= now) return "soon";

  const utcDay = (date: Date) => date.toISOString().slice(0, 10);
  if (utcDay(end) === utcDay(now)) return "today";

  return end.toLocaleDateString("en-us", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function useNextCycleResetDate({
  billingPeriodEnd,
  enabled = true,
}: {
  billingPeriodEnd?: Date | string | null;
  enabled?: boolean;
}) {
  return useMemo(
    () => (enabled ? getNextCycleResetDate(billingPeriodEnd) : null),
    [enabled, billingPeriodEnd],
  );
}

export function formatResetDate(nextResetDate: string | null) {
  if (!nextResetDate) return "next cycle";
  if (nextResetDate === "soon") return "shortly";
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
