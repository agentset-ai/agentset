"use client";

import { formatNumber } from "@/lib/utils";

import { cn } from "@agentset/ui/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";
import { formatBytes } from "@agentset/utils";

export type TimestampTooltipProps = {
  totalCharacters: number;
  totalChunks: number;
  totalBytes?: number;
  totalTokens: number;
  children: React.ReactNode;
};

export function TimestampTooltip({
  totalCharacters,
  totalChunks,
  totalBytes,
  totalTokens,
  children,
}: TimestampTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>

      <TooltipContent className="max-w-[360px]" side="right">
        <TimestampTooltipContent
          totalCharacters={totalCharacters}
          totalChunks={totalChunks}
          totalBytes={totalBytes}
          totalTokens={totalTokens}
        />
      </TooltipContent>
    </Tooltip>
  );
}

function TimestampTooltipContent({
  totalCharacters,
  totalChunks,
  totalBytes,
  totalTokens,
}: Pick<
  TimestampTooltipProps,
  "totalCharacters" | "totalChunks" | "totalBytes" | "totalTokens"
>) {
  const rows = [
    {
      label: "Characters",
      value: formatNumber(totalCharacters, "compact"),
    },
    {
      label: "Tokens",
      value: formatNumber(totalTokens, "compact"),
    },
    {
      label: "Chunks",
      value: formatNumber(totalChunks, "compact"),
    },
    {
      label: "Size",
      value: totalBytes ? formatBytes(totalBytes) : "-",
    },
  ];

  return (
    <div className="text-left text-xs">
      <table>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td className="relative py-0.5">
                <span className={cn("truncate")} title={row.label}>
                  {row.label}
                </span>
              </td>
              <td className={cn("relative py-0.5 pl-3 whitespace-nowrap")}>
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
