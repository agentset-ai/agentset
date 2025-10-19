"use client";

import type { ComponentProps } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOrganization } from "@/hooks/use-organization";
import { logEvent } from "@/lib/analytics";
import { getBaseUrl } from "@/lib/utils";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { getStripe } from "@agentset/stripe/client";
import { SELF_SERVE_PAID_PLANS } from "@agentset/stripe/plans";
import { Button } from "@agentset/ui/button";
import { capitalize } from "@agentset/utils";

export function UpgradePlanButton({
  plan,
  period,
  children,
  ...rest
}: {
  plan: string;
  period: "monthly" | "yearly";
} & Partial<ComponentProps<typeof Button>>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trpc = useTRPC();
  const organization = useOrganization();

  const { mutateAsync, isPending } = useMutation(
    trpc.billing.upgrade.mutationOptions({
      onSuccess: async (data) => {
        if (data.url) {
          router.push(data.url);
        } else if (data.sessionId) {
          const stripe = await getStripe();
          void stripe?.redirectToCheckout({ sessionId: data.sessionId });
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const selectedPlan = (SELF_SERVE_PAID_PLANS.find(
    (p) => p.name.toLowerCase() === plan.toLowerCase(),
  ) ?? SELF_SERVE_PAID_PLANS[0])!;

  const queryString = searchParams.toString();
  const isCurrentPlan = organization.plan === selectedPlan.name.toLowerCase();

  const onClick = async () => {
    logEvent(
      "billing_upgrade_clicked",
      {
        organizationId: organization.id,
        plan,
        period,
      },
      { sendInstantly: true },
    );

    await mutateAsync({
      orgId: organization.id,
      plan: plan as any,
      period,
      baseUrl: `${getBaseUrl()}${pathname}${queryString.length > 0 ? `?${queryString}` : ""}`,
    });
  };

  return (
    <Button
      isLoading={isPending}
      disabled={isCurrentPlan}
      onClick={onClick}
      {...rest}
    >
      {children ||
        (isCurrentPlan
          ? "Your current plan"
          : organization.plan === "free"
            ? `Get started with ${selectedPlan.name} ${capitalize(period)}`
            : `Switch to ${selectedPlan.name} ${capitalize(period)}`)}
    </Button>
  );
}
