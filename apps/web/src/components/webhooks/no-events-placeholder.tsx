import { WebhookIcon } from "lucide-react";

import { EmptyState } from "@agentset/ui/empty-state";

export default function NoEventsPlaceholder() {
  return (
    <div className="rounded-xl border py-10">
      <EmptyState
        icon={WebhookIcon}
        title="No events yet"
        description="Events will appear here as they are logged."
      />
    </div>
  );
}
