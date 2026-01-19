"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import WebhookEvents from "@/components/webhooks/webhook-events";
import WebhookStatus from "@/components/webhooks/webhook-status";
import { useOrganization } from "@/hooks/use-organization";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@agentset/ui/alert-dialog";
import { Button } from "@agentset/ui/button";

export default function WebhookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organization = useOrganization();
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const webhookId = params.webhookId as string;

  const { data: webhook, isLoading } = useQuery(
    trpc.webhook.get.queryOptions({
      organizationId: organization.id,
      webhookId,
    }),
  );

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

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="bg-muted h-8 w-48 rounded" />
        <div className="bg-muted h-32 rounded" />
      </div>
    );
  }

  if (!webhook) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Webhook not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/${organization.slug}/webhooks`}>
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{webhook.name}</h2>
              <WebhookStatus disabledAt={webhook.disabledAt} />
            </div>
            <p className="text-muted-foreground text-sm">{webhook.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              toggleMutation.mutate({
                organizationId: organization.id,
                webhookId,
              })
            }
            disabled={toggleMutation.isPending}
          >
            {webhook.disabledAt ? "Enable" : "Disable"}
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/${organization.slug}/webhooks/${webhookId}/edit`}>
              <PencilIcon className="h-4 w-4" />
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this webhook? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    deleteMutation.mutate({
                      organizationId: organization.id,
                      webhookId,
                    })
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-medium">Triggers</h3>
          <div className="flex flex-wrap gap-2">
            {webhook.triggers.map((trigger) => (
              <span
                key={trigger}
                className="bg-secondary rounded px-2 py-1 text-sm"
              >
                {trigger}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-medium">Secret</h3>
          <code className="bg-muted rounded px-2 py-1 text-sm">
            {webhook.secret}
          </code>
        </div>

        <WebhookEvents organizationId={organization.id} webhookId={webhookId} />
      </div>
    </div>
  );
}
