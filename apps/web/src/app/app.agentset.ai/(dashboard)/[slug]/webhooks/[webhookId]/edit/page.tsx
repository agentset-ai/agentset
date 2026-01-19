"use client";

import { useParams, useRouter } from "next/navigation";
import AddEditWebhookForm from "@/components/webhooks/add-edit-webhook-form";
import { useOrganization } from "@/hooks/use-organization";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

export default function EditWebhookPage() {
  const params = useParams();
  const router = useRouter();
  const organization = useOrganization();
  const trpc = useTRPC();

  const webhookId = params.webhookId as string;

  const { data: webhook, isLoading } = useQuery(
    trpc.webhook.get.queryOptions({
      organizationId: organization.id,
      webhookId,
    }),
  );

  if (!organization.isAdmin) {
    router.push(`/${organization.slug}/webhooks`);
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full max-w-md animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-10 w-full max-w-md animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-40 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
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
