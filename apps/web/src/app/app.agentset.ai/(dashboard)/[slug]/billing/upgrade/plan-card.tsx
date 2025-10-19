import NumberFlow from "@number-flow/react";
import { CheckIcon, MinusIcon } from "lucide-react";

import type { ENTERPRISE_PLAN, PRO_PLAN } from "@agentset/stripe/plans";
import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";

import { UpgradePlanButton } from "./upgrade-button";

const PlanCard = ({
  plan,
  period,
  isCurrentPlan,
  isDowngrade,
}: {
  plan: typeof PRO_PLAN | typeof ENTERPRISE_PLAN;
  period: "monthly" | "yearly";
  isCurrentPlan: boolean;
  isDowngrade: boolean;
}) => {
  const isEnterprise = plan.name === "Enterprise";
  const planKey = plan.name.toLowerCase();

  return (
    <div className="border-border bg-card flex flex-col justify-between rounded-3xl border p-8 shadow-sm">
      <div>
        <h3 className="text-primary text-base/7 font-semibold">{plan.name}</h3>

        <div className="mt-4 flex items-baseline gap-x-2">
          {typeof plan.price === "string" ? (
            <span className="text-5xl leading-[72px] font-semibold tracking-tight">
              {plan.price}
            </span>
          ) : (
            <>
              <NumberFlow
                value={plan.price[period]}
                className="text-5xl font-semibold tracking-tight tabular-nums"
                format={{
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                }}
              />

              <span className="text-muted-foreground text-base/7 font-semibold">
                /{period === "monthly" ? "month" : "year"}
              </span>
            </>
          )}
        </div>
        <p className="mt-6 text-base/7 text-gray-600">{plan.description}</p>
        <ul role="list" className="mt-10 space-y-4 text-sm/6">
          {plan.features.map((feature) => {
            const isDisabled = "disabled" in feature && !!feature.disabled;
            const Icon = isDisabled ? MinusIcon : CheckIcon;
            return (
              <li
                key={feature.id}
                className={cn(
                  "flex gap-x-3",
                  isDisabled
                    ? "text-muted-foreground opacity-70"
                    : "text-card-foreground",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "h-6 w-5 flex-none",
                    isDisabled ? "text-muted-foreground" : "text-primary",
                  )}
                />

                {feature.text}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8">
        {isEnterprise ? (
          <Button asChild className="h-10 w-full shadow-sm">
            <a href="mailto:sales@agentset.ai" target="_blank">
              Contact Sales
            </a>
          </Button>
        ) : (
          <UpgradePlanButton
            plan={planKey}
            period={period}
            disabled={isCurrentPlan || (isDowngrade && planKey === "free")}
            variant={isDowngrade ? "secondary" : "default"}
            className="h-10 w-full shadow-sm"
          >
            {isCurrentPlan
              ? "Current plan"
              : isDowngrade
                ? "Downgrade"
                : "Upgrade"}
          </UpgradePlanButton>
        )}
      </div>
    </div>
  );
};

export default PlanCard;
