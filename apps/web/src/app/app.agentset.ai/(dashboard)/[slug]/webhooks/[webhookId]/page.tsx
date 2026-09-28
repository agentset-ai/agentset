"use client";

import { useParams } from "next/navigation";
import WebhookEvents from "@/components/webhooks/webhook-events";
import { useOrganization } from "@/hooks/use-organization";
import { WebhookIcon } from "lucide-react";

import { EmptyState } from "@agentset/ui/empty-state";
import { REGION_FEATURES } from "@agentset/utils";

export default function WebhookDetailPage() {
  const params = useParams();
  const organization = useOrganization();
  const webhookId = params.webhookId as string;

  if (!REGION_FEATURES.webhookDeliveryLogs) {
    return (
      <div className="rounded-xl border py-10">
        <EmptyState
          icon={WebhookIcon}
          title="Delivery logs aren't available in this region"
          description="Events are still delivered to your endpoint."
        />
      </div>
    );
  }

  return (
    <WebhookEvents organizationId={organization.id} webhookId={webhookId} />
  );
}
