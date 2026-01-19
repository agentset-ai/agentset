"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AddEditWebhookForm from "@/components/webhooks/add-edit-webhook-form";
import { useOrganization } from "@/hooks/use-organization";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";

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
      <div className="mx-auto max-w-2xl animate-pulse space-y-4">
        <div className="bg-muted h-8 w-48 rounded" />
        <div className="bg-muted h-64 rounded" />
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
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${organization.slug}/webhooks/${webhookId}`}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-xl font-semibold">Edit Webhook</h2>
      </div>

      <AddEditWebhookForm
        organizationId={organization.id}
        organizationSlug={organization.slug}
        webhook={webhook}
      />
    </div>
  );
}
