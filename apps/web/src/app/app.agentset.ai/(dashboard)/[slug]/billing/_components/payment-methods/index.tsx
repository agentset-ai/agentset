"use client";

import { useOrganization } from "@/hooks/use-organization";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "@bprogress/next/app";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCardIcon } from "lucide-react";
import { toast } from "sonner";

import type { Stripe } from "@agentset/stripe";
import { Badge } from "@agentset/ui/badge";
import { Button } from "@agentset/ui/button";
import { Card, CardDescription, CardTitle } from "@agentset/ui/card";
import { cn } from "@agentset/ui/cn";
import { DataWrapper } from "@agentset/ui/data-wrapper";
import { EmptyState } from "@agentset/ui/empty-state";
import { Separator } from "@agentset/ui/separator";
import { Skeleton } from "@agentset/ui/skeleton";

import { PaymentMethodTypesList } from "./payment-methods-types";

export default function PaymentMethods() {
  const organization = useOrganization();
  if (organization.plan === "free") {
    return null;
  }

  return <PaymentMethodsInner />;
}

function PaymentMethodsInner() {
  const router = useRouter();
  const organization = useOrganization();
  const trpc = useTRPC();

  const { data: paymentMethods, isLoading } = useQuery(
    trpc.billing.getPaymentMethods.queryOptions({
      orgId: organization.id,
    }),
  );

  const { mutateAsync: addPaymentMethod, isPending: isAdding } = useMutation(
    trpc.billing.addPaymentMethod.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const regularPaymentMethods = paymentMethods?.filter(
    (pm) => pm.type !== "us_bank_account",
  );

  const managePaymentMethods = async () => {
    const url = await addPaymentMethod({ orgId: organization.id });
    if (url) {
      router.push(url);
    }
  };

  return (
    <div className="mt-12">
      <div className="flex flex-col items-start justify-between gap-y-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-medium">Payment methods</h2>
          <p className="text-muted-foreground mt-1 text-sm text-balance">
            Manage your payment methods
          </p>
        </div>

        {organization.stripeId && (
          <Button
            variant="ghost"
            onClick={() => managePaymentMethods()}
            isLoading={isAdding}
          >
            Manage
          </Button>
        )}
      </div>

      <Separator className="my-4" />

      <div className="grid gap-4">
        <DataWrapper
          data={regularPaymentMethods}
          isLoading={isLoading}
          loadingState={
            <>
              <PaymentMethodCardSkeleton />
              <PaymentMethodCardSkeleton />
            </>
          }
          emptyState={
            <EmptyState
              title="No payment methods found"
              description="You haven't added any payment methods yet"
              icon={CreditCardIcon}
            />
          }
        >
          {(data) =>
            data.map((paymentMethod) => (
              <PaymentMethodCard
                key={paymentMethod.id}
                type={paymentMethod.type}
                paymentMethod={paymentMethod}
              />
            ))
          }
        </DataWrapper>
      </div>
    </div>
  );
}

const PaymentMethodCard = ({
  type,
  paymentMethod,
}: {
  type: Stripe.PaymentMethod.Type;
  paymentMethod: Stripe.PaymentMethod;
}) => {
  const result = PaymentMethodTypesList(paymentMethod);
  const {
    title,
    icon: Icon,
    iconBgColor,
    description,
  } = (result.find((method) => method.type === type) ?? result[0])!;

  return (
    <Card className="flex-row gap-4 p-4">
      <div
        className={cn(
          "bg-muted flex size-12 items-center justify-center rounded-lg",
          iconBgColor,
        )}
      >
        <Icon className="text-muted-foreground size-6" />
      </div>

      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <CardTitle>{title}</CardTitle>
          {(type === "us_bank_account" || paymentMethod.link?.email) && (
            <Badge variant="success">Connected</Badge>
          )}
        </div>

        <CardDescription>{description}</CardDescription>
      </div>
    </Card>
  );
};

const PaymentMethodCardSkeleton = () => {
  return (
    <Card className="flex-row gap-4 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-lg" />
        <div>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-1 h-4 w-32" />
        </div>
      </div>
    </Card>
  );
};
