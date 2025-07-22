"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useOrganization } from "@/contexts/organization-context";
import { getFirstAndLastDay } from "@/lib/datetime";
import { capitalize } from "@/lib/string-utils";
import { formatNumber } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import {
  BookIcon,
  FoldersIcon,
  PlugIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";

import {
  Button,
  Card,
  CardDescription,
  cn,
  Progress,
  Separator,
  Skeleton,
} from "@agentset/ui";
import { INFINITY_NUMBER } from "@agentset/utils";

import SubscriptionMenu from "./subscription-menu";

export default function PlanUsage() {
  const { activeOrganization } = useOrganization();

  const [billingStart, billingEnd] = useMemo(() => {
    if (activeOrganization.billingCycleStart) {
      const { firstDay, lastDay } = getFirstAndLastDay(
        activeOrganization.billingCycleStart,
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
  }, [activeOrganization.billingCycleStart]);

  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-y-4 lg:flex-row">
        <div>
          <h2 className="text-xl font-medium">
            {capitalize(activeOrganization.plan)} Plan
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
          {activeOrganization.plan !== "pro" && (
            <Button asChild>
              <Link href={`/${activeOrganization.slug}/billing/upgrade`}>
                Upgrade
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href={`/${activeOrganization.slug}/billing/invoices`}>
              View invoices
            </Link>
          </Button>
          {activeOrganization.stripeId &&
            activeOrganization.plan !== "free" && <SubscriptionMenu />}
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-[minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-3 lg:gap-6">
          <UsageTabCard
            icon={FoldersIcon}
            title="Namespaces"
            usage={activeOrganization.totalNamespaces}
            limit={3} // TODO: get from API
          />

          <UsageTabCard
            icon={BookIcon}
            title="Pages"
            usage={activeOrganization.totalPages}
            limit={activeOrganization.pagesLimit}
          />

          <UsageTabCard
            icon={SearchIcon}
            title="Retrievals"
            usage={activeOrganization.searchUsage}
            limit={activeOrganization.searchLimit}
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
              {activeOrganization.apiRatelimit} requests per min
            </div>
          </Card>
        </div>
      </div>
    </div>
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
