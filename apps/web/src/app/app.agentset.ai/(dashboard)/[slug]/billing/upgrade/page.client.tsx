"use client";

import { useState } from "react";
import Link from "next/link";
import { useCal } from "@/hooks/use-cal";
import { useOrganization } from "@/hooks/use-organization";
import { ChevronLeftIcon } from "lucide-react";

import {
  ENTERPRISE_PLAN,
  FREE_PLAN,
  isDowngradePlan,
  PRO_PLAN,
} from "@agentset/stripe/plans";
import { Tabs, TabsList, TabsTrigger } from "@agentset/ui/tabs";

import PlanCard from "./plan-card";

const plans = [FREE_PLAN, PRO_PLAN, ENTERPRISE_PLAN];

export default function OrganizationBillingUpgradePageClient() {
  const organization = useOrganization();
  const { plan: currentPlan } = organization;
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");

  const { buttonProps } = useCal();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/${organization.slug}/billing`}
          title="Back to billing"
          className="group flex items-center gap-2"
        >
          <ChevronLeftIcon
            className="text-muted-foreground mt-px size-5 transition-transform duration-100 group-hover:-translate-x-0.5"
            strokeWidth={2}
          />
          <h1 className="text-xl font-semibold">Plans</h1>
        </Link>

        <Tabs
          value={period}
          onValueChange={(value) => setPeriod(value as "monthly" | "yearly")}
        >
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <p className="text-muted-foreground mt-6">
        Unsure what plan is right for?{" "}
        <button
          className="text-primary cursor-pointer underline"
          {...buttonProps}
        >
          Book a call
        </button>
      </p>

      <div className="mx-auto mt-6 grid w-full max-w-md grid-cols-1 gap-6 lg:max-w-7xl lg:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            period={period}
            isCurrentPlan={plan.name.toLowerCase() === currentPlan}
            isDowngrade={isDowngradePlan(currentPlan, plan.name)}
          />
        ))}
      </div>
    </div>
  );
}
