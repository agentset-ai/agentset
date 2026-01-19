"use client";

import { useParams } from "next/navigation";
import WebhookEvents from "@/components/webhooks/webhook-events";
import { useOrganization } from "@/hooks/use-organization";

export default function WebhookDetailPage() {
  const params = useParams();
  const organization = useOrganization();
  const webhookId = params.webhookId as string;

  return <WebhookEvents organizationId={organization.id} webhookId={webhookId} />;
}
