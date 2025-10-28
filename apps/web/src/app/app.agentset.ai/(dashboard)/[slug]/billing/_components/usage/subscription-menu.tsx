"use client";

import { useState } from "react";
import { useOrganization } from "@/hooks/use-organization";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "@bprogress/next/app";
import { useMutation } from "@tanstack/react-query";
import { CalendarSyncIcon, MoreVerticalIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@agentset/ui/dropdown-menu";

export default function SubscriptionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { id } = useOrganization();
  const router = useRouter();
  const trpc = useTRPC();

  const { mutateAsync: cancelSubscription, isPending: isCancelling } =
    useMutation(
      trpc.billing.cancel.mutationOptions({
        onError: (error) => {
          toast.error(error.message);
        },
      }),
    );

  const { mutateAsync: manageSubscription, isPending: isManaging } =
    useMutation(
      trpc.billing.manage.mutationOptions({
        onError: (error) => {
          toast.error(error.message);
        },
      }),
    );

  const isLoading = isCancelling || isManaging;

  const openBillingPortal = async (cancel: boolean) => {
    setIsOpen(false);

    const method = cancel ? cancelSubscription : manageSubscription;
    const portalUrl = await method({ orgId: id });

    router.push(portalUrl);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="ghost" isLoading={isLoading}>
          <MoreVerticalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-48 rounded-lg"
        side="bottom"
        align="end"
      >
        <DropdownMenuItem onClick={() => openBillingPortal(false)}>
          <CalendarSyncIcon />
          Manage
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => openBillingPortal(true)}>
          <XIcon />
          Cancel Subscription
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
