import type { MyUIMessage } from "@/types/ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useIsHosting } from "@/contexts/hosting-context";
import { ExpandIcon, SearchIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@agentset/ui/ai/chain-of-thought";
import { Shimmer } from "@agentset/ui/ai/shimmer";

type MessagePart = MyUIMessage["parts"][number];
type ToolPart = Extract<MessagePart, { type: "tool-search" | "tool-expand" }>;
type PlanningPart = Extract<MessagePart, { type: "data-planning" }>;

const extractToolParts = (message: MyUIMessage) =>
  message.parts.filter(
    (p): p is ToolPart => p.type === "tool-search" || p.type === "tool-expand",
  );

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

// documentId -> filename, so an expand step can name the document it's reading
const buildDocumentNameMap = (toolParts: ToolPart[]) => {
  const map = new Map<string, string>();
  for (const part of toolParts) {
    if (part.state !== "output-available") continue;
    for (const chunk of part.output) {
      if (chunk.filename && !map.has(chunk.documentId)) {
        map.set(chunk.documentId, chunk.filename);
      }
    }
  }
  return map;
};

// ===============================================
// Playground: expandable chain-of-thought with per-tool steps and the
// streamed plan — the debugging-friendly view.
// ===============================================

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
          const isLastStep = index === steps.length - 1;

          if (step.kind === "planning") {
            // a plan is only in progress while it's the newest step
            return (
              <ChainOfThoughtStep
                key={step.part.id ?? `planning-${index}`}
                label="Planning..."
                description={step.part.data}
                status={isLoading && isLastStep ? "active" : "complete"}
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

// ===============================================
// Hosted: a single rotating shimmer line with no expandable steps or plan —
// the end-user view, mirroring qaf's consumer web app.
// ===============================================

type TimelineEntry =
  | { kind: "thinking" }
  | { kind: "searching"; query?: string }
  | { kind: "reading"; document?: string };

// Minimum time (ms) a single entry stays visible before the rotating header
// advances to the next one.
const SEARCH_PACING_MS = 3000;

/**
 * Walks through `entries` one at a time, keeping each visible for at least
 * `minMs`. Tool calls often arrive in parallel (e.g. several searches in a
 * single render); without this the header would jump straight to the last one
 * and the intermediate states would never be shown.
 */
function useHeaderQueue<T>(entries: T[], minMs: number): T | undefined {
  const [index, setIndex] = useState(0);
  const shownAtRef = useRef<number>(0);

  useEffect(() => {
    // initialized here (not in the render path) to keep the render pure
    if (shownAtRef.current === 0) shownAtRef.current = Date.now();

    // an out-of-range index (entries shrank) is clamped at render time
    const last = entries.length - 1;
    if (index >= last) return;

    const remaining = Math.max(0, minMs - (Date.now() - shownAtRef.current));
    const id = setTimeout(() => {
      shownAtRef.current = Date.now();
      setIndex((i) => i + 1);
    }, remaining);
    return () => clearTimeout(id);
  }, [entries.length, index, minMs]);

  if (entries.length === 0) {
    return undefined;
  }
  return entries[Math.min(index, entries.length - 1)];
}

const labelForEntry = (entry: TimelineEntry): string => {
  switch (entry.kind) {
    case "thinking":
      return "Researching...";
    case "searching":
      return entry.query ? entry.query : "Searching...";
    case "reading":
      return entry.document ? `Reading ${entry.document}...` : "Reading...";
  }
};

const HostedMessageStatus = ({
  message,
  isLoading,
}: {
  message: MyUIMessage;
  isLoading: boolean;
}) => {
  const toolParts = useMemo(() => extractToolParts(message), [message]);

  // switch the header to "Answering..." once the answer starts streaming
  const answerStarted = useMemo(
    () => message.parts.some((p) => p.type === "text" && p.text.length > 0),
    [message],
  );

  const uniqueSourceCount = useMemo(() => countSources(toolParts), [toolParts]);

  // Ordered timeline of header states. Cumulative (only grows) so the queue
  // index stays stable as new tool calls stream in.
  const timeline = useMemo<TimelineEntry[]>(() => {
    if (!isLoading) {
      return [];
    }

    const entries: TimelineEntry[] = [{ kind: "thinking" }];
    const documentNames = buildDocumentNameMap(toolParts);
    for (const part of toolParts) {
      // don't show input-streaming parts
      if (part.state === "input-streaming") continue;

      if (part.type === "tool-expand") {
        const documentId =
          part.input?.documentId ??
          (part.state === "output-available"
            ? part.output[0]?.documentId
            : undefined);
        entries.push({
          kind: "reading",
          document: documentId ? documentNames.get(documentId) : undefined,
        });
      } else {
        entries.push({
          kind: "searching",
          query: part.input?.label ?? part.input?.query,
        });
      }
    }
    return entries;
  }, [isLoading, toolParts]);

  const queuedEntry = useHeaderQueue(timeline, SEARCH_PACING_MS);

  if (!isLoading && toolParts.length === 0) return null;

  const finalLabel =
    uniqueSourceCount === 0
      ? "Done!"
      : `Searched ${uniqueSourceCount} ${uniqueSourceCount === 1 ? "source" : "sources"}`;

  let label = finalLabel;
  if (isLoading) {
    if (answerStarted) {
      label = "Answering...";
    } else {
      label = queuedEntry ? labelForEntry(queuedEntry) : "Researching...";
    }
  }

  const showSearchIcon =
    isLoading && !answerStarted && queuedEntry?.kind === "searching";

  return (
    <div className="mt-4">
      <div className="text-muted-foreground flex w-full items-center gap-0.5 text-sm">
        <div className="relative overflow-hidden text-start">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              animate={{ y: "0%", opacity: 1 }}
              className="inline-flex items-center gap-2 whitespace-nowrap"
              exit={{ y: "-100%", opacity: 0 }}
              initial={{ y: "100%", opacity: 0 }}
              key={label}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {showSearchIcon && (
                <SearchIcon
                  aria-hidden="true"
                  className="fill-muted-foreground/15 text-muted-foreground/60 size-4 shrink-0"
                />
              )}
              <Shimmer
                animate={isLoading}
                className={isLoading ? undefined : "text-inherit"}
                duration={0.85}
              >
                {label}
              </Shimmer>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export const MessageStatus = ({
  message,
  isLoading,
}: {
  message: MyUIMessage;
  isLoading: boolean;
}) => {
  const isHosting = useIsHosting();

  if (isHosting) {
    return <HostedMessageStatus message={message} isLoading={isLoading} />;
  }

  return <AgenticMessageStatus message={message} isLoading={isLoading} />;
};
