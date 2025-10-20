"use client";

import type { RouterOutputs } from "@/trpc/react";
import Link from "next/link";
import { useOrganization } from "@/hooks/use-organization";
import { formatNumber } from "@/lib/utils";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, DollarSignIcon, ReceiptTextIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { DataWrapper } from "@agentset/ui/data-wrapper";
import { EmptyState } from "@agentset/ui/empty-state";
import { Separator } from "@agentset/ui/separator";
import { Skeleton } from "@agentset/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";

export default function OrganizationInvoicesClient() {
  const organization = useOrganization();
  const trpc = useTRPC();
  const { data: invoices, isLoading } = useQuery(
    trpc.billing.invoices.queryOptions({
      orgId: organization.id,
    }),
  );

  return (
    <div>
      <div>
        <Link
          href={`/${organization.slug}/billing`}
          title="Back to billing"
          className="group flex items-center gap-2"
        >
          <ChevronLeftIcon className="text-muted-foreground size-5" />
          <h2 className="text-xl font-medium">Invoices</h2>
        </Link>

        <p className="text-muted-foreground mt-1 text-sm text-balance">
          A history of all your invoices
        </p>
      </div>

      <Separator className="my-4" />

      <div className="grid">
        <DataWrapper
          data={invoices}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              title="No invoices found"
              description="You don't have any invoices yet"
              icon={ReceiptTextIcon}
            />
          }
          loadingState={
            <>
              <InvoiceCardSkeleton />
              <InvoiceCardSkeleton />
              <InvoiceCardSkeleton />
            </>
          }
        >
          {(data) =>
            data.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))
          }
        </DataWrapper>
      </div>
    </div>
  );
}

type Invoice = RouterOutputs["billing"]["invoices"][number];
const InvoiceCard = ({ invoice }: { invoice: Invoice }) => {
  return (
    <div className="grid grid-cols-3 gap-4 py-4">
      <div className="text-sm">
        <div className="font-medium">{invoice.description}</div>
        <div className="text-muted-foreground">
          {new Date(invoice.createdAt).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
            day: "numeric",
          })}
        </div>
      </div>

      <div className="text-left text-sm">
        <div className="font-medium">Total</div>
        <div className="text-muted-foreground flex items-center gap-1.5">
          <span className="text-sm">
            {formatNumber(invoice.total / 100, "currency")}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end">
        {invoice.pdfUrl ? (
          <Button variant="outline" asChild>
            <a href={invoice.pdfUrl} target="_blank">
              <p className="hidden sm:block">View invoice</p>
              <DollarSignIcon className="size-4 sm:hidden" />
            </a>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" disabled>
                  View invoice
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>
                {("failedReason" in invoice
                  ? (invoice.failedReason as string)
                  : null) ||
                  "Invoice not available. Contact support if you need assistance."}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

const InvoiceCardSkeleton = () => {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>

      <Skeleton className="h-8 w-16" />
    </div>
  );
};
