import type { FormattedChunk } from "@/lib/agentic-search/format-chunk";
import { useMemo } from "react";
import { useHosting, useIsHosting } from "@/contexts/hosting-context";

import { SingleLanguageCodeBlock } from "@agentset/ui/ai/code-block";
import { MessageResponse } from "@agentset/ui/ai/message";
import { cn } from "@agentset/ui/cn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agentset/ui/dialog";
import { truncate } from "@agentset/utils";

interface CitationModalProps {
  source: { text: string; metadata?: Record<string, unknown> };
  sourceIndex: number;
  triggerProps: React.ComponentProps<"button">;
}

const useHostingCitationName = ({
  source,
  sourceIndex,
}: Pick<CitationModalProps, "source" | "sourceIndex">) => {
  const isHosting = useIsHosting();

  // it's fine to call hooks conditionally here because we'll never get a different value for `isHosting` within the same render
  if (!isHosting) return null;

  const hosting = useHosting();
  const citationName = useMemo(() => {
    if (!hosting.citationMetadataPath || !source.metadata) return null;

    const path = hosting.citationMetadataPath.split(".");
    let value: unknown = source.metadata;

    for (const key of path) {
      if (
        value === null ||
        typeof value !== "object" ||
        typeof value === "undefined"
      )
        return null;
      value = (value as Record<string, unknown>)[key];
    }

    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (typeof value === "boolean") return value ? "True" : "False";

    return null;
  }, [hosting, source.metadata]);

  return citationName ? citationName : `[${sourceIndex}]`;
};

const stringifyMetadata = (metadata?: Record<string, unknown>) => {
  if (!metadata || Object.keys(metadata).length === 0) return null;
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return "Failed to parse metadata!";
  }
};

/**
 * Pill-style citation for agentic search: one citation can reference multiple
 * chunks, resolved by id from the message's tool outputs.
 */
export function ChunksCitationModal({ chunks }: { chunks: FormattedChunk[] }) {
  const label = chunks[0]?.filename ?? "Source";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground mx-0.5 cursor-pointer rounded-full px-2 py-0.5 text-sm font-medium hover:no-underline"
          type="button"
        >
          {truncate(label, 25, "...")}
          {chunks.length > 1 && (
            <span className="ms-1">+{chunks.length - 1}</span>
          )}
        </button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-2xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault(); // prevents Radix from auto-focusing the first focusable
        }}
        scrollableOverlay
      >
        <DialogHeader>
          <DialogTitle>{chunks.length > 1 ? "Sources" : label}</DialogTitle>
        </DialogHeader>

        {chunks.map((chunk, index) => {
          const stringifiedMetadata = stringifyMetadata(chunk.metadata);

          return (
            <div
              key={chunk.id}
              className={cn(index > 0 && "border-border mt-6 border-t pt-6")}
            >
              {chunks.length > 1 && chunk.filename && (
                <h3 className="mb-2 text-xs font-medium">{chunk.filename}</h3>
              )}

              <MessageResponse mode="static" className="mt-2">
                {chunk.text}
              </MessageResponse>

              {stringifiedMetadata && (
                <div className="mt-4">
                  <h3 className="text-xs font-medium">Metadata</h3>
                  <div className="mt-2">
                    <SingleLanguageCodeBlock
                      code={stringifiedMetadata}
                      language="json"
                      header={false}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </DialogContent>
    </Dialog>
  );
}

export function CitationModal({
  source,
  sourceIndex,
  triggerProps,
}: CitationModalProps) {
  const hostingCitation = useHostingCitationName({ source, sourceIndex });
  const stringifiedMetadata = useMemo(() => {
    if (!source.metadata) return null;
    try {
      return JSON.stringify(source.metadata, null, 2);
    } catch {
      return "Failed to parse metadata!";
    }
  }, [source]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {hostingCitation ? (
          <button
            {...triggerProps}
            className={cn(
              triggerProps.className,
              "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground mx-0.5 cursor-pointer rounded-full px-2 py-0.5 text-sm font-medium hover:no-underline",
            )}
          >
            {truncate(hostingCitation, 35, "...")}
          </button>
        ) : (
          <button
            className={cn(
              triggerProps.className,
              "cursor-pointer text-blue-500 hover:underline",
            )}
            {...triggerProps}
          >
            <span className="mx-1.5">{triggerProps.children}</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-2xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault(); // prevents Radix from auto-focusing the first focusable
        }}
        scrollableOverlay
      >
        <DialogHeader>
          <DialogTitle>
            {hostingCitation || `Source [${sourceIndex}]`}
          </DialogTitle>
        </DialogHeader>

        <MessageResponse mode="static" className="mt-4">
          {source.text}
        </MessageResponse>

        {stringifiedMetadata && (
          <div className="border-border mt-6 overflow-hidden border-t pt-6">
            <h3 className="text-xs font-medium">Metadata</h3>
            <div className="mt-2">
              <SingleLanguageCodeBlock
                code={stringifiedMetadata}
                language="json"
                header={false}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
