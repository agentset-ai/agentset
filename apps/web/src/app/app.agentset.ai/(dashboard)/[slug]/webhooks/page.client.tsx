"use client";

import Link from "next/link";
import WebhookCard from "@/components/webhooks/webhook-card";
import { useOrganization } from "@/hooks/use-organization";
import { useWebhooks } from "@/hooks/use-webhooks";
import { WebhookIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { EmptyState } from "@agentset/ui/empty-state";

export default function WebhooksPageClient() {
  const organization = useOrganization();
  const { webhooks, isLoading } = useWebhooks(organization.id);

  if (!organization.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          You don&apos;t have permission to manage webhooks.
        </p>
      </div>
    );
  }

  return (
    <div>
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted h-20 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : webhooks && webhooks.length > 0 ? (
        <div>
          <div className="flex items-center justify-end">
            <Button asChild>
              <Link href={`/${organization.slug}/webhooks/new`}>
                Create Webhook
              </Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-4">
            {webhooks.map((webhook) => (
              <WebhookCard key={webhook.id} webhook={webhook} />
            ))}
          </div>
        </div>
      ) : (
        <div className="border-border w-full rounded-md border py-16">
          <EmptyState
            title="No webhooks yet"
            description="Webhooks allow you to receive HTTP requests when events occur in your organization."
            icon={WebhookIcon}
            action={
              <Button asChild>
                <Link href={`/${organization.slug}/webhooks/new`}>
                  Create your first webhook
                </Link>
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
