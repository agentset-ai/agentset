"use client";

import { useParams } from "next/navigation";
import WebhookHeader from "@/components/webhooks/webhook-header";

export default function WebhookDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ webhookId: string }>();

  return (
    <div className="flex flex-col gap-6">
      <WebhookHeader webhookId={params.webhookId} />
      {children}
    </div>
  );
}
