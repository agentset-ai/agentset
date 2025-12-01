"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDuration, intervalToDuration } from "date-fns";
import { toast } from "sonner";

import { cn } from "@agentset/ui/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_MS;

export type TimestampTooltipProps = {
  timestamp: Date | string | number | null | undefined;
  rows?: ("local" | "utc" | "unix")[];
  interactive?: boolean;
} & React.ComponentProps<typeof TooltipContent>;

let localTimeZone: string | undefined;
function getLocalTimeZone(): string {
  if (localTimeZone) return localTimeZone;

  if (typeof Intl !== "undefined") {
    try {
      localTimeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
    } catch (e) {}
  }

  if (!localTimeZone) localTimeZone = "Local";
  return localTimeZone;
}

export function TimestampTooltip({
  timestamp,
  rows,
  interactive = true,
  children,
  className,
  ...tooltipProps
}: TimestampTooltipProps) {
  if (!timestamp || new Date(timestamp).toString() === "Invalid Date")
    return children;

  return (
    <Tooltip disableHoverableContent={!interactive}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        className={cn("max-w-[360px] px-2.5 py-2", className)}
        {...tooltipProps}
      >
        <TimestampTooltipContent
          timestamp={timestamp}
          rows={rows}
          interactive={interactive}
        />
      </TooltipContent>
    </Tooltip>
  );
}

function TimestampTooltipContent({
  timestamp,
  rows = ["local", "utc", "unix"],
  interactive,
}: Pick<TimestampTooltipProps, "timestamp" | "rows" | "interactive">) {
  if (!timestamp)
    throw new Error("Falsy timestamp not permitted in TimestampTooltipContent");

  const date = new Date(timestamp);

  const commonFormat: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  };

  const diff = new Date().getTime() - date.getTime();
  const relativeDuration = intervalToDuration({
    start: date,
    end: new Date(),
  });
  const relative =
    formatDuration(relativeDuration, {
      delimiter: ", ",
      format: [
        "years",
        "months",
        "days",
        ...(diff < MONTH_MS
          ? [
              "hours" as const,
              ...(diff < DAY_MS
                ? ["minutes" as const, "seconds" as const]
                : []),
            ]
          : []),
      ],
    }) + " ago";

  const items: {
    label: string;
    shortLabel?: string;
    successMessageLabel: string;
    value: string;
    valueMono?: boolean;
  }[] = useMemo(
    () =>
      rows.map(
        (key) =>
          ({
            local: {
              label: getLocalTimeZone(),
              shortLabel: new Date()
                .toLocaleTimeString("en-US", { timeZoneName: "short" })
                .split(" ")[2],
              successMessageLabel: "local timestamp",
              value: date.toLocaleString("en-US", commonFormat),
            },

            utc: {
              label: "UTC",
              shortLabel: "UTC",
              successMessageLabel: "UTC timestamp",
              value: new Date(date.getTime()).toLocaleString("en-US", {
                ...commonFormat,
                timeZone: "UTC",
              }),
            },

            unix: {
              label: "UNIX Timestamp",
              successMessageLabel: "UNIX timestamp",
              value: (date.getTime() / 1000).toString(),
              valueMono: true,
            },
          })[key]!,
      ),
    [rows, date],
  );

  const shortLabels = items.every(({ shortLabel }) => shortLabel);

  // Re-render every second to update the relative time
  const [_, setRenderCount] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setRenderCount((c) => c + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-2 text-left text-xs">
      {diff > 0 && (
        <span className="text-primary-foreground/70 cursor-default">
          {relative}
        </span>
      )}

      <table>
        <tbody>
          {items.map((row, idx) => (
            <tr
              key={idx}
              className={cn(
                interactive &&
                  "before:bg-muted/30 relative select-none before:absolute before:-inset-x-1 before:inset-y-0 before:rounded before:opacity-0 before:content-[''] hover:cursor-copy hover:before:opacity-60 active:before:opacity-100",
              )}
              onClick={
                interactive
                  ? async () => {
                      try {
                        await navigator.clipboard.writeText(row.value);
                        toast.success(
                          `Copied ${row.successMessageLabel} to clipboard`,
                        );
                      } catch (e) {
                        toast.error(
                          `Failed to copy ${row.successMessageLabel} to clipboard`,
                        );
                        console.error(
                          `Failed to copy ${row.successMessageLabel} to clipboard`,
                          e,
                        );
                      }
                    }
                  : undefined
              }
            >
              <td className="relative py-0.5">
                <span
                  className={cn(
                    "text-primary-foreground/70 truncate",
                    shortLabels &&
                      "bg-primary-foreground/20 rounded px-1 font-mono",
                  )}
                  title={shortLabels ? row.label : undefined}
                >
                  {shortLabels ? row.shortLabel : row.label}
                </span>
              </td>
              <td
                className={cn(
                  "relative py-0.5 pl-3 whitespace-nowrap",
                  shortLabels && "pl-2",
                  row.valueMono && "font-mono",
                )}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TimestampTooltip;
