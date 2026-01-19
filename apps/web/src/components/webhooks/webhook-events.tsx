"use client";

import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "lucide-react";

import { cn } from "@agentset/ui/cn";

interface WebhookEventsProps {
  organizationId: string;
  webhookId: string;
}

export default function WebhookEvents({
  organizationId,
  webhookId,
}: WebhookEventsProps) {
  const trpc = useTRPC();
  const { data: events, isLoading } = useQuery(
    trpc.webhook.getEvents.queryOptions({
      organizationId,
      webhookId,
    }),
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 font-medium">Recent Events</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted h-16 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 font-medium">Recent Events</h3>
      {events && events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => {
            const isSuccess =
              event.http_status >= 200 && event.http_status < 300;
            const isPending = event.http_status === 0;

            return (
              <div
                key={event.event_id}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    isSuccess
                      ? "bg-green-100 dark:bg-green-900/30"
                      : isPending
                        ? "bg-yellow-100 dark:bg-yellow-900/30"
                        : "bg-destructive/10",
                  )}
                >
                  {isSuccess ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : isPending ? (
                    <ClockIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <XCircleIcon className="text-destructive h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{event.event}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs font-medium",
                        isSuccess
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : isPending
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {event.http_status || "Pending"}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(event.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-center text-sm">
          No events yet. Events will appear here once webhooks are triggered.
        </p>
      )}
    </div>
  );
}
