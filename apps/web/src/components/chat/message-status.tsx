import type { MyUIMessage } from "@/types/ai";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import {
  ExpandIcon,
  MessageSquareIcon,
  PencilIcon,
  SearchIcon,
} from "lucide-react";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@agentset/ui/ai/chain-of-thought";
import { Shimmer } from "@agentset/ui/ai/shimmer";

type MessagePart = MyUIMessage["parts"][number];
type ToolPart = Extract<MessagePart, { type: "tool-search" | "tool-expand" }>;
type PlanningPart = Extract<MessagePart, { type: "data-planning" }>;

type AgenticStep =
  | { kind: "tool"; part: ToolPart }
  | { kind: "planning"; part: PlanningPart };

const extractAgenticSteps = (message: MyUIMessage) => {
  const steps: AgenticStep[] = [];
  const toolParts: ToolPart[] = [];
  const planningParts: PlanningPart[] = [];

  for (const part of message.parts) {
    if (part.type === "tool-search" || part.type === "tool-expand") {
      steps.push({ kind: "tool", part });
      toolParts.push(part);
    } else if (part.type === "data-planning") {
      steps.push({ kind: "planning", part });
      planningParts.push(part);
    }
  }

  return { steps, toolParts, planningParts };
};

const countSources = (toolParts: ToolPart[]) => {
  const documentIds = new Set<string>();
  for (const part of toolParts) {
    if (part.state !== "output-available") continue;
    for (const chunk of part.output) {
      documentIds.add(chunk.documentId);
    }
  }
  return documentIds.size;
};

const getHeaderLabel = ({
  toolParts,
  planningParts,
  isLoading,
}: {
  toolParts: ToolPart[];
  planningParts: PlanningPart[];
  isLoading: boolean;
}) => {
  if (!isLoading) {
    const count = countSources(toolParts);
    if (count === 0) return "Done!";
    return `Searched ${count} ${count === 1 ? "source" : "sources"}`;
  }

  const lastPart = toolParts.at(-1);
  if (!lastPart) {
    if (planningParts.length > 0) return "Planning...";
    return "Thinking...";
  }

  if (lastPart.type === "tool-expand") {
    return "Expanding context...";
  }

  const searchLabel = lastPart.input?.label ?? lastPart.input?.query;
  if (searchLabel) return `Searching "${searchLabel}"`;

  return "Searching...";
};

const AgenticToolStep = ({
  part,
  status,
}: {
  part: ToolPart;
  status: "complete" | "active" | "pending";
}) => {
  if (part.type === "tool-expand") {
    const filename =
      part.state === "output-available" ? part.output[0]?.filename : undefined;

    return (
      <ChainOfThoughtStep
        icon={ExpandIcon}
        label="Expanding context..."
        description={filename}
        status={status}
      />
    );
  }

  const input = part.state === "input-streaming" ? undefined : part.input;

  return (
    <ChainOfThoughtStep
      icon={SearchIcon}
      label={
        input?.query
          ? `[${input.mode.toUpperCase()}] Searching "${input.query}"`
          : "Searching..."
      }
      description={input?.label}
      status={status}
    />
  );
};

const AgenticMessageStatus = ({
  message,
  isLoading,
}: {
  message: MyUIMessage;
  isLoading: boolean;
}) => {
  // open while streaming, collapsed when done — unless the user toggles it
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? isLoading;

  const { steps, toolParts, planningParts } = extractAgenticSteps(message);

  if (steps.length === 0) {
    if (!isLoading) return null;
    return (
      <Shimmer animate className="mt-4 text-sm">
        Thinking...
      </Shimmer>
    );
  }

  const headerLabel = getHeaderLabel({ toolParts, planningParts, isLoading });
  const lastToolPart = toolParts.at(-1);

  return (
    <ChainOfThought open={open} onOpenChange={setUserOpen} className="mt-4">
      <ChainOfThoughtHeader isLoading={isLoading} showIcon={false}>
        {headerLabel}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {steps.map((step, index) => {
          if (step.kind === "planning") {
            return (
              <ChainOfThoughtStep
                key={step.part.id ?? `planning-${index}`}
                label="Planning..."
                description={step.part.data}
                status={isLoading ? "pending" : "complete"}
              />
            );
          }

          const status =
            isLoading && step.part === lastToolPart ? "active" : "complete";
          return (
            <AgenticToolStep
              key={step.part.toolCallId}
              part={step.part}
              status={status}
            />
          );
        })}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
};

// legacy pipeline progress (hosted chat): data-status parts
const STATUS_LABELS: Record<
  Extract<MessagePart, { type: "data-status" }>["data"]["value"],
  { label: string; icon: LucideIcon }
> = {
  "generating-queries": { label: "Generating queries...", icon: PencilIcon },
  searching: { label: "Searching...", icon: SearchIcon },
  "generating-answer": {
    label: "Generating answer...",
    icon: MessageSquareIcon,
  },
};

const LegacyMessageStatus = ({
  statusParts,
  isLoading,
}: {
  statusParts: Extract<MessagePart, { type: "data-status" }>[];
  isLoading: boolean;
}) => {
  // open while streaming, collapsed when done — unless the user toggles it
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? isLoading;

  return (
    <ChainOfThought open={open} onOpenChange={setUserOpen} className="mt-4">
      <ChainOfThoughtHeader isLoading={isLoading} />
      <ChainOfThoughtContent>
        {statusParts.map(({ data, id }, index) => {
          const { label, icon: Icon } = STATUS_LABELS[data.value];
          const isLast = index === statusParts.length - 1;
          return (
            <ChainOfThoughtStep
              key={`${id}-${index}`}
              icon={Icon}
              label={label}
              status={isLoading && isLast ? "active" : "complete"}
            >
              {data.value === "searching" ? (
                <ChainOfThoughtSearchResults className="flex-wrap">
                  {data.queries.map((query) => (
                    <ChainOfThoughtSearchResult key={query}>
                      {query}
                    </ChainOfThoughtSearchResult>
                  ))}
                </ChainOfThoughtSearchResults>
              ) : null}
            </ChainOfThoughtStep>
          );
        })}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
};

export const MessageStatus = ({
  message,
  isLoading,
}: {
  message: MyUIMessage;
  isLoading: boolean;
}) => {
  const statusParts = message.parts.filter((p) => p.type === "data-status");

  // legacy pipeline messages (hosted chat) only carry data-status parts
  if (statusParts.length > 0) {
    return (
      <LegacyMessageStatus statusParts={statusParts} isLoading={isLoading} />
    );
  }

  return <AgenticMessageStatus message={message} isLoading={isLoading} />;
};
