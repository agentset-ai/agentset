"use client";

import { useParams } from "next/navigation";
import WebhookHeader from "@/components/webhooks/webhook-header";

export default function WebhookDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const webhookId = params.webhookId as string;

  return (
    <div className="space-y-6">
      <WebhookHeader webhookId={webhookId} />
      {children}
    </div>
  );
}
