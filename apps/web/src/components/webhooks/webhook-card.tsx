import type { WebhookProps } from "@/lib/webhook/types";
import Link from "next/link";
import { useOrganization } from "@/hooks/use-organization";
import { WebhookIcon } from "lucide-react";

import WebhookStatus from "./webhook-status";

interface WebhookCardProps {
  webhook: WebhookProps;
}

export default function WebhookCard({ webhook }: WebhookCardProps) {
  const organization = useOrganization();

  return (
    <Link
      href={`/${organization.slug}/webhooks/${webhook.id}`}
      className="hover:bg-muted/50 flex items-center gap-4 rounded-lg border p-4 transition-colors"
    >
      <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
        <WebhookIcon className="text-muted-foreground h-5 w-5" />
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-medium">{webhook.name}</span>
          <WebhookStatus disabledAt={webhook.disabledAt} />
        </div>
        <p className="text-muted-foreground truncate text-sm">{webhook.url}</p>
      </div>
      <div className="text-muted-foreground text-sm">
        {webhook.triggers.length} trigger{webhook.triggers.length !== 1 && "s"}
      </div>
    </Link>
  );
}
