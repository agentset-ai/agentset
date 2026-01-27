"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation";
import { useOrganization } from "@/hooks/use-organization";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CopyIcon,
  MoreHorizontalIcon,
  SendIcon,
  Trash2Icon,
  WebhookIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@agentset/ui/dropdown-menu";
import { Skeleton } from "@agentset/ui/skeleton";

import { useSendTestWebhookModal } from "./send-test-webhook-modal";
import WebhookStatus from "./webhook-status";

interface WebhookHeaderProps {
  webhookId: string;
}

export default function WebhookHeader({ webhookId }: WebhookHeaderProps) {
  const router = useRouter();
  const organization = useOrganization();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  const { data: webhook, isLoading } = useQuery(
    trpc.webhook.get.queryOptions({
      organizationId: organization.id,
      webhookId,
    }),
  );

  const { setShowModal: setShowTestModal, SendTestWebhookModal } =
    useSendTestWebhookModal({ webhook });

  const deleteMutation = useMutation(
    trpc.webhook.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Webhook deleted");
        queryClient.invalidateQueries({
          queryKey: trpc.webhook.list.queryKey({
            organizationId: organization.id,
          }),
        });
        router.push(`/${organization.slug}/webhooks`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const toggleMutation = useMutation(
    trpc.webhook.toggle.mutationOptions({
      onSuccess: () => {
        toast.success(
          webhook?.disabledAt ? "Webhook enabled" : "Webhook disabled",
        );
        queryClient.invalidateQueries({
          queryKey: trpc.webhook.get.queryKey({
            organizationId: organization.id,
            webhookId,
          }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.webhook.list.queryKey({
            organizationId: organization.id,
          }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const copyWebhookId = () => {
    navigator.clipboard.writeText(webhookId);
    toast.success("Webhook ID copied");
  };

  const tabs = [
    {
      id: "",
      label: "Event Logs",
      href: `/${organization.slug}/webhooks/${webhookId}`,
    },
    {
      id: "edit",
      label: "Configuration",
      href: `/${organization.slug}/webhooks/${webhookId}/edit`,
    },
  ];

  return (
    <>
      <SendTestWebhookModal />
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete webhook"
        description="This will permanently delete this webhook and stop all event deliveries."
        itemName={webhook?.name ?? ""}
        onConfirm={() =>
          deleteMutation.mutate({
            organizationId: organization.id,
            webhookId,
          })
        }
        isLoading={deleteMutation.isPending}
      />

      <div className="space-y-6">
        <Link
          href={`/${organization.slug}/webhooks`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeftIcon className="size-4" />
          Back to webhooks
        </Link>

        <div className="flex items-start justify-between gap-8">
          {isLoading || !webhook ? (
            <div className="flex items-center gap-3">
              <Skeleton className="size-12" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-muted shrink-0 rounded-md border p-2.5">
                <WebhookIcon className="text-muted-foreground size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">
                    {webhook.name}
                  </span>
                  <WebhookStatus disabledAt={webhook.disabledAt} />
                </div>
                <a
                  href={webhook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground line-clamp-1 text-sm underline-offset-4 hover:underline"
                >
                  {webhook.url}
                </a>
              </div>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={copyWebhookId}>
                <CopyIcon className="size-4" />
                Copy Webhook ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTestModal(true)}>
                <SendIcon className="size-4" />
                Send test event
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  toggleMutation.mutate({
                    organizationId: organization.id,
                    webhookId,
                  })
                }
                disabled={toggleMutation.isPending}
              >
                {webhook?.disabledAt ? (
                  <>
                    <CheckCircle2Icon className="size-4" />
                    Enable webhook
                  </>
                ) : (
                  <>
                    <XCircleIcon className="size-4" />
                    Disable webhook
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                variant="destructive"
              >
                <Trash2Icon className="size-4" />
                Delete webhook
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="border-b">
          <nav className="-mb-px flex items-center gap-4">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "border-b-2 px-1 py-2 text-sm font-medium transition-colors",
                  page === tab.id
                    ? "border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
