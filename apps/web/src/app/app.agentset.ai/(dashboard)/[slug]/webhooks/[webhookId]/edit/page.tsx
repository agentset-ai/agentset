"use client";

import { useParams } from "next/navigation";
import AddEditWebhookForm from "@/components/webhooks/add-edit-webhook-form";
import { useOrganization } from "@/hooks/use-organization";
import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@agentset/ui/skeleton";

export default function EditWebhookPage() {
  const params = useParams<{ webhookId: string }>();
  const organization = useOrganization();

  const { data: webhook, isLoading } = useQuery(
    orpc.webhook.get.queryOptions({
      input: { webhookId: params.webhookId },
      context: { orgId: organization.id },
      select: (r) => r.data,
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
