"use client";

import Link from "next/link";
import { useOrganization } from "@/contexts/organization-context";
import { useCal } from "@/hooks/use-cal";
import { INFINITY_NUMBER } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

import { Button, Progress } from "@agentset/ui";

export function Usage() {
  const { activeOrganization } = useOrganization();
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
                <p>
                  {formatUsage(
                    activeOrganization.totalPages,
                    activeOrganization.pagesLimit,
                  )}
                </p>
              </div>

              <Progress
                value={
                  (activeOrganization.totalPages /
                    activeOrganization.pagesLimit) *
                  100
                }
                className="h-[2.5px]"
              />
            </div>

            <div className="text-foreground text-xs font-medium">
              <div className="mb-2 flex justify-between">
                <p>Retrievals</p>
                <p>
                  {formatUsage(
                    activeOrganization.searchUsage,
                    activeOrganization.searchLimit,
                  )}
                </p>
              </div>

              <Progress
                value={
                  (activeOrganization.searchUsage /
                    activeOrganization.searchLimit) *
                  100
                }
                className="h-[2.5px]"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {activeOrganization.plan === "free" && (
            <Button asChild className="w-full">
              <Link href={`/${activeOrganization.slug}/billing/upgrade`}>
                Get Pro
              </Link>
            </Button>
          )}

          <Button variant="outline" className="w-full" {...buttonProps}>
            Schedule a Demo
          </Button>
        </div>
      </div>
    </div>
  );
}
