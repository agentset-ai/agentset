"use client";

import Link from "next/link";
import {
  PagesUsageTooltipContent,
  useNextCycleResetDate,
} from "@/components/pages-usage-tooltip";
import { useCal } from "@/hooks/use-cal";
import { useOrganization } from "@/hooks/use-organization";
import { formatNumber } from "@/lib/utils";

import { Button } from "@agentset/ui/button";
import { Progress } from "@agentset/ui/progress";
import { Skeleton } from "@agentset/ui/skeleton";
import { Tooltip, TooltipTrigger } from "@agentset/ui/tooltip";
import { INFINITY_NUMBER } from "@agentset/utils";

export function Usage() {
  const activeOrganization = useOrganization();
  const { buttonProps } = useCal();

  const formatUsage = (usage: number, limit: number) => {
    if (limit >= INFINITY_NUMBER) return "Unlimited";
    return `${formatNumber(usage, "compact")} of ${formatNumber(limit, "compact")}`;
  };

  const totalPages = activeOrganization.totalPages ?? 0;
  const deletedPages = Math.min(
    activeOrganization.deletedPages ?? 0,
    totalPages,
  );
  const activePages = totalPages - deletedPages;
  const pagesLimit = activeOrganization.pagesLimit ?? 0;

  // scale against usage when it exceeds the limit so the deleted segment
  // stays visible, and keep it at least 1% wide when there is anything to show
  const pagesDenominator = Math.max(pagesLimit, totalPages) || 1;
  const deletedPercent =
    deletedPages > 0 ? Math.max((deletedPages / pagesDenominator) * 100, 1) : 0;
  const activePercent = Math.min(
    (activePages / pagesDenominator) * 100,
    100 - deletedPercent,
  );

  const nextResetDate = useNextCycleResetDate({
    billingCycleStart: activeOrganization.billingCycleStart,
    createdAt: activeOrganization.createdAt,
    enabled: !activeOrganization.isLoading,
  });

  return (
    <div className="mt-4">
      <div className="w-full px-2">
        <div>
          <p className="text-muted-foreground text-sm font-medium">Usage</p>

          <div className="mt-4 flex flex-col gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  tabIndex={0}
                  className="text-foreground text-xs font-medium"
                >
                  <div className="mb-2 flex justify-between">
                    <p>Pages</p>
                    {activeOrganization.isLoading ? (
                      <Skeleton className="h-3 w-16" />
                    ) : (
                      <p>{formatUsage(totalPages, pagesLimit)}</p>
                    )}
                  </div>

                  {activeOrganization.isLoading ? (
                    <Skeleton className="h-[2.5px] w-full" />
                  ) : (
                    <Progress
                      segments={[
                        { value: activePercent },
                        { value: deletedPercent, className: "bg-red-400" },
                      ]}
                      className="bg-primary/20 h-[2.5px]"
                    />
                  )}
                </div>
              </TooltipTrigger>

              {!activeOrganization.isLoading && (
                <PagesUsageTooltipContent
                  activePages={activePages}
                  deletedPages={deletedPages}
                  nextResetDate={nextResetDate}
                />
              )}
            </Tooltip>

            <div className="text-foreground text-xs font-medium">
              <div className="mb-2 flex justify-between">
                <p>Retrievals</p>
                {activeOrganization.isLoading ? (
                  <Skeleton className="h-3 w-16" />
                ) : (
                  <p>
                    {formatUsage(
                      activeOrganization.searchUsage ?? 0,
                      activeOrganization.searchLimit ?? 0,
                    )}
                  </p>
                )}
              </div>

              {activeOrganization.isLoading ? (
                <Skeleton className="h-[2.5px] w-full" />
              ) : (
                <Progress
                  value={
                    activeOrganization.searchUsage &&
                    activeOrganization.searchLimit
                      ? (activeOrganization.searchUsage /
                          activeOrganization.searchLimit) *
                        100
                      : 0
                  }
                  className="bg-primary/20 h-[2.5px]"
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {activeOrganization.isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            activeOrganization.plan === "free" && (
              <Button asChild className="w-full">
                <Link href={`/${activeOrganization.slug}/billing/upgrade`}>
                  Upgrade to Pro
                </Link>
              </Button>
            )
          )}

          <Button variant="outline" className="w-full" {...buttonProps}>
            Schedule a Demo
          </Button>
        </div>
      </div>
    </div>
  );
}
