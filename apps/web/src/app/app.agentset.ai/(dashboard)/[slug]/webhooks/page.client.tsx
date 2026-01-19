"use client";

import Link from "next/link";
import WebhookCard from "@/components/webhooks/webhook-card";
import WebhookSkeleton from "@/components/webhooks/webhook-skeleton";
import { useOrganization } from "@/hooks/use-organization";
import { useWebhooks } from "@/hooks/use-webhooks";
import { WebhookIcon } from "lucide-react";

import { isFreePlan } from "@agentset/stripe/plans";
import { Button } from "@agentset/ui/button";
import { EmptyState } from "@agentset/ui/empty-state";
import { Skeleton } from "@agentset/ui/skeleton";

export default function WebhooksPageClient() {
  const organization = useOrganization();
  const { webhooks, isLoading } = useWebhooks(organization.id);

  const needsHigherPlan = isFreePlan(organization.plan);

  if (needsHigherPlan) {
    return (
      <div className="rounded-xl border py-16">
        <EmptyState
          icon={WebhookIcon}
          title="Webhooks"
          description="Webhooks allow you to receive HTTP requests when events occur in your organization."
          action={
            <Button asChild>
              <Link href={`/${organization.slug}/billing/upgrade`}>
                Upgrade to Pro
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-end">
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="mt-6 grid gap-3">
          {[1, 2, 3].map((i) => (
            <WebhookSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!webhooks || webhooks.length === 0) {
    return (
      <div className="rounded-xl border py-16">
        <EmptyState
          icon={WebhookIcon}
          title="No webhooks yet"
          description="Webhooks allow you to receive HTTP requests when events occur in your organization."
          action={
            <Button asChild>
              <Link href={`/${organization.slug}/webhooks/new`}>
                Create your first webhook
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end">
        <Button asChild>
          <Link href={`/${organization.slug}/webhooks/new`}>
            Create Webhook
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-3">
        {webhooks.map((webhook) => (
          <WebhookCard key={webhook.id} webhook={webhook} />
        ))}
      </div>
    </div>
  );
}
