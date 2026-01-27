"use client";

import { useParams } from "next/navigation";
import AddEditWebhookForm from "@/components/webhooks/add-edit-webhook-form";
import { useOrganization } from "@/hooks/use-organization";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@agentset/ui/skeleton";

export default function EditWebhookPage() {
  const params = useParams<{ webhookId: string }>();
  const organization = useOrganization();
  const trpc = useTRPC();

  const { data: webhook, isLoading } = useQuery(
    trpc.webhook.get.queryOptions({
      organizationId: organization.id,
      webhookId: params.webhookId,
    }),
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-40 w-full" />
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
    <AddEditWebhookForm
      organizationId={organization.id}
      organizationSlug={organization.slug}
      webhook={webhook}
    />
  );
}
