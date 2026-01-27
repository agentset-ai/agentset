"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { CodeBlock, CodeBlockCopyButton } from "@agentset/ui/ai/code-block";
import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@agentset/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";

import NoEventsPlaceholder from "./no-events-placeholder";

interface WebhookEventsProps {
  organizationId: string;
  webhookId: string;
}

interface WebhookEvent {
  event_id: string;
  event: string;
  http_status: number;
  timestamp: string;
  request_body?: unknown;
  response_body?: string;
}

function WebhookEventItem({
  event,
  onClick,
}: {
  event: WebhookEvent;
  onClick: () => void;
}) {
  const isSuccess = event.http_status >= 200 && event.http_status < 300;
  const isPending = event.http_status === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-accent/40 flex w-full items-center justify-between gap-5 px-4 py-3 focus:outline-none"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                {isSuccess ? (
                  <CheckCircle2Icon className="size-4 text-green-500" />
                ) : isPending ? (
                  <ClockIcon className="size-4 text-amber-500" />
                ) : (
                  <XCircleIcon className="size-4 text-red-500" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {isSuccess
                ? "Successfully delivered"
                : isPending
                  ? "Pending delivery"
                  : "Failed to deliver"}
            </TooltipContent>
          </Tooltip>

          <span className="text-muted-foreground text-sm">
            {event.http_status || "—"}
          </span>
        </div>

        <span className="text-foreground text-sm">{event.event}</span>
      </div>

      <span className="text-muted-foreground text-xs">
        {formatDistanceToNow(new Date(event.timestamp + "Z"), {
          addSuffix: true,
        })}
      </span>
    </button>
  );
}

function EventDetailSheet({
  event,
  open,
  onOpenChange,
}: {
  event: WebhookEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, copyToClipboard] = useCopyToClipboard();
  if (!event) return null;

  const isSuccess = event.http_status >= 200 && event.http_status < 300;

  const copyEventId = async () => {
    const copied = await copyToClipboard(event.event_id);
    if (copied) {
      toast.success("Event ID copied");
    } else {
      toast.error("Failed to copy event ID");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{event.event}</SheetTitle>
          <div className="flex items-center gap-2">
            <code className="text-muted-foreground font-mono text-sm">
              {event.event_id}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={copyEventId}
            >
              <CopyIcon className="size-3" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold">Response</h4>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                HTTP status code
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-xs font-medium",
                  isSuccess
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700",
                )}
              >
                {event.http_status}
              </span>
            </div>
            {event.response_body && (
              <pre className="overflow-x-auto rounded-lg bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
                {typeof event.response_body === "string"
                  ? event.response_body
                  : JSON.stringify(event.response_body, null, 2)}
              </pre>
            )}
          </div>

          {event.request_body !== undefined && event.request_body !== null && (
            <div className="flex flex-col gap-3">
              <h4 className="font-semibold">Request</h4>
              <CodeBlock
                code={
                  typeof event.request_body === "string"
                    ? JSON.stringify(JSON.parse(event.request_body), null, 2)
                    : JSON.stringify(event.request_body, null, 2)
                }
                language="json"
              >
                <CodeBlockCopyButton />
              </CodeBlock>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EventsListSkeleton() {
  return (
    <div className="rounded-xl border">
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="size-4 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                <div className="h-4 w-8 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
              </div>
              <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
            </div>
            <div className="h-3 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WebhookEvents({
  organizationId,
  webhookId,
}: WebhookEventsProps) {
  const trpc = useTRPC();
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: events, isLoading } = useQuery(
    trpc.webhook.getEvents.queryOptions({
      organizationId,
      webhookId,
    }),
  );

  if (isLoading) {
    return <EventsListSkeleton />;
  }

  if (!events || events.length === 0) {
    return <NoEventsPlaceholder />;
  }

  return (
    <>
      <div className="rounded-xl border">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {events.map((event) => (
            <WebhookEventItem
              key={event.event_id}
              event={event as WebhookEvent}
              onClick={() => {
                setSelectedEvent(event as WebhookEvent);
                setSheetOpen(true);
              }}
            />
          ))}
        </div>
      </div>

      <EventDetailSheet
        event={selectedEvent}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
