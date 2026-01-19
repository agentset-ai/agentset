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
      className="hover:bg-accent/40 relative flex items-center gap-3 rounded-xl border bg-white px-5 py-4 transition-colors"
    >
      <div className="bg-muted shrink-0 rounded-md border p-2">
        <WebhookIcon className="text-muted-foreground size-5" />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className="text-foreground font-semibold">{webhook.name}</span>

          <WebhookStatus disabledAt={webhook.disabledAt} />
        </div>

        <p className="text-muted-foreground truncate text-sm">{webhook.url}</p>
      </div>
    </Link>
  );
}
