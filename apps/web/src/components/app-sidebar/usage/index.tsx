"use client";

import Link from "next/link";
import { useCal } from "@/hooks/use-cal";
import { useOrganization } from "@/hooks/use-organization";
import { formatNumber } from "@/lib/utils";

import { Button } from "@agentset/ui/button";
import { Progress } from "@agentset/ui/progress";
import { Skeleton } from "@agentset/ui/skeleton";
import { INFINITY_NUMBER } from "@agentset/utils";

export function Usage() {
  const activeOrganization = useOrganization();
  const { buttonProps } = useCal();

  const formatUsage = (usage: number, limit: number) => {
    if (limit >= INFINITY_NUMBER) return "Unlimited";
    return `${formatNumber(usage, "compact")} of ${formatNumber(limit, "compact")}`;
  };

  return (
    <div className="mt-4">
      <div className="w-full px-2">
        <div>
          <p className="text-muted-foreground text-sm font-medium">Usage</p>

          <div className="mt-4 flex flex-col gap-4">
            <div className="text-foreground text-xs font-medium">
              <div className="mb-2 flex justify-between">
                <p>Pages</p>
                {activeOrganization.isLoading ? (
                  <Skeleton className="h-3 w-16" />
                ) : (
                  <p>
                    {formatUsage(
                      activeOrganization.totalPages ?? 0,
                      activeOrganization.pagesLimit ?? 0,
                    )}
                  </p>
                )}
              </div>

              {activeOrganization.isLoading ? (
                <Skeleton className="h-[2.5px] w-full" />
              ) : (
                <Progress
                  value={
                    activeOrganization.totalPages &&
                    activeOrganization.pagesLimit
                      ? (activeOrganization.totalPages /
                          activeOrganization.pagesLimit) *
                        100
                      : 0
                  }
                  className="h-[2.5px]"
                />
              )}
            </div>

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
                  className="h-[2.5px]"
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
                  Get Pro
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
