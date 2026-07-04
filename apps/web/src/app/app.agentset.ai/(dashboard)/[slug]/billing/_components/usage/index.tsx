"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  formatResetDate,
  PagesUsageTooltipContent,
  useNextCycleResetDate,
} from "@/components/pages-usage-tooltip";
import { useOrganization } from "@/hooks/use-organization";
import { formatNumber } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { BookIcon, PlugIcon, SearchIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { Card, CardDescription } from "@agentset/ui/card";
import { cn } from "@agentset/ui/cn";
import { Progress } from "@agentset/ui/progress";
import { Separator } from "@agentset/ui/separator";
import { Skeleton } from "@agentset/ui/skeleton";
import { Tooltip, TooltipTrigger } from "@agentset/ui/tooltip";
import {
  capitalize,
  getFirstAndLastDay,
  INFINITY_NUMBER,
} from "@agentset/utils";

import SubscriptionMenu from "./subscription-menu";

export default function PlanUsage() {
  const organization = useOrganization();

  const [billingStart, billingEnd] = useMemo(() => {
    if (organization.billingCycleStart) {
      const { firstDay, lastDay } = getFirstAndLastDay(
        organization.billingCycleStart,
      );
      const start = firstDay.toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const end = lastDay.toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return [start, end];
    }

    return [];
  }, [organization.billingCycleStart]);

  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-y-4 lg:flex-row">
        <div>
          <h2 className="text-xl font-medium">
            {capitalize(organization.plan)} Plan
          </h2>
          {billingStart && billingEnd && (
            <p className="text-muted-foreground mt-1 text-sm font-medium text-balance">
              Current billing cycle:{" "}
              <span className="font-normal">
                {billingStart} - {billingEnd}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {organization.plan !== "pro" && (
            <Button asChild>
              <Link href={`/${organization.slug}/billing/upgrade`}>
                Upgrade
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href={`/${organization.slug}/billing/invoices`}>
              View invoices
            </Link>
          </Button>
          {organization.stripeId && organization.plan !== "free" && (
            <SubscriptionMenu />
          )}
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-[minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-3 lg:gap-6">
          <PagesCard />

          <UsageTabCard
            icon={SearchIcon}
            title="Retrievals"
            usage={organization.searchUsage}
            limit={organization.searchLimit}
          />

          {/* <UsageTabCard
            icon={UsersIcon}
            title="Users"
            usage={1} // TODO: get from API
            limit={10} // TODO: get from API
          /> */}

          <Card className="gap-0 px-4 py-3 lg:px-5 lg:py-5">
            <PlugIcon className="text-muted-foreground size-4" />
            <CardDescription className="mt-1.5">API Ratelimit</CardDescription>

            <div className="text-card-foreground mt-2 text-xl leading-8">
              {organization.apiRatelimit} requests per min
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PagesCard() {
  const organization = useOrganization();

  const currentPages = organization.totalPages;
  const deletedPages = Math.min(organization.deletedPages, currentPages);
  const activePages = currentPages - deletedPages;
  const limit = organization.pagesLimit;
  const remaining = Math.max(0, limit - currentPages);

  const nextResetDate = useNextCycleResetDate({
    billingCycleStart: organization.billingCycleStart,
    createdAt: organization.createdAt,
    enabled: !organization.isLoading,
  });

  // scale against usage when it exceeds the limit, and show at least 1%
  // for non-zero values
  const denominator = Math.max(1, currentPages, limit);
  const toPercent = (value: number) =>
    Math.max(Math.floor((value / denominator) * 100), value === 0 ? 0 : 1);
  const deletedPercent = toPercent(deletedPages);
  const activePercent = Math.min(toPercent(activePages), 100 - deletedPercent);

  return (
    <Card className="gap-0 px-4 py-3 lg:px-5 lg:py-5">
      <BookIcon className="text-muted-foreground size-4" />
      <CardDescription className="mt-1.5">Pages</CardDescription>

      <div className="mt-2">
        <NumberFlow
          value={currentPages}
          className="text-card-foreground text-xl leading-none"
          format={{ notation: "standard" }}
        />
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <div tabIndex={0} className="mt-3">
            <div className="bg-primary/10 h-1 w-full overflow-hidden rounded-full">
              <Progress
                segments={[
                  { value: activePercent },
                  { value: deletedPercent, className: "bg-red-400" },
                ]}
              />
            </div>
          </div>
        </TooltipTrigger>

        <PagesUsageTooltipContent
          activePages={activePages}
          deletedPages={deletedPages}
          nextResetDate={nextResetDate}
        />
      </Tooltip>

      <div className="mt-2 leading-none">
        <span className="text-muted-foreground text-xs">
          {`${formatNumber(remaining, "decimal")} remaining of ${formatNumber(limit, "decimal")}`}
        </span>
      </div>

      {deletedPages > 0 && (
        <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs leading-none">
          <span className="size-1.5 shrink-0 rounded-full bg-red-400" />
          <span>
            {formatNumber(deletedPages, "decimal")} deleted · frees up{" "}
            {formatResetDate(nextResetDate)}
          </span>
        </div>
      )}

    </Card>
  );
}

function UsageTabCard({
  icon: Icon,
  title,
  usage: usageProp,
  limit: limitProp,
  unit,
}: {
  icon: React.ElementType;
  title: string;
  usage: number;
  limit: number;
  unit?: string;
}) {
  const [usage, limit] =
    unit === "$" ? [usageProp / 100, limitProp / 100] : [usageProp, limitProp];
  const unlimited = limit >= INFINITY_NUMBER;
  const prefix = unit || "";
  const remaining = !unlimited ? Math.max(0, limit - usage) : 0;
  const loading = false;

  return (
    <Card className="gap-0 px-4 py-3 lg:px-5 lg:py-5">
      <Icon className="text-muted-foreground size-4" />
      <CardDescription className="mt-1.5">{title}</CardDescription>

      <div className="mt-2">
        {!loading ? (
          <NumberFlow
            value={usage}
            className="text-card-foreground text-xl leading-none"
            format={
              unit === "$"
                ? {
                    style: "currency",
                    currency: "USD",
                    // @ts-expect-error – trailingZeroDisplay is a valid option but TS is outdated
                    trailingZeroDisplay: "stripIfInteger",
                  }
                : {
                    notation: usage < INFINITY_NUMBER ? "standard" : "compact",
                  }
            }
          />
        ) : (
          <Skeleton className="h-5 w-16" />
        )}
      </div>

      <div className="mt-3">
        <div
          className={cn(
            "bg-primary/10 h-1 w-full overflow-hidden rounded-full transition-colors",
            loading && "bg-primary/5",
          )}
        >
          {!loading && !unlimited && (
            <Progress
              value={Math.max(
                Math.floor((usage / Math.max(0, usage, limit)) * 100),
                usage === 0 ? 0 : 1,
              )}
            />
          )}
        </div>
      </div>

      <div className="mt-2 leading-none">
        {!loading ? (
          <span className="text-muted-foreground text-xs">
            {unlimited
              ? "Unlimited"
              : `${prefix}${formatNumber(remaining, "decimal")} remaining of ${prefix}${formatNumber(limit, "decimal")}`}
          </span>
        ) : (
          <Skeleton className="h-4 w-20" />
        )}
      </div>
    </Card>
  );
}
