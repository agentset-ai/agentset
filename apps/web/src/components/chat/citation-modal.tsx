import type { FormattedChunk } from "@/lib/agentic-search/format-chunk";
import { use } from "react";
import { HostingContext } from "@/contexts/hosting-context";

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

// resolves the hosting-configured citation label (a dot-path into the chunk's
// metadata, e.g. "title" or "foo.bar")
const resolveMetadataPath = (chunk: FormattedChunk, path: string) => {
  // hoisted fields (e.g. filename) stay addressable
  let value: unknown = { filename: chunk.filename, ...chunk.metadata };

  for (const key of path.split(".")) {
    if (value === null || typeof value !== "object") return null;
    value = (value as Record<string, unknown>)[key];
  }

  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value ? "True" : "False";

  return null;
};

const useCitationLabel = (chunk?: FormattedChunk) => {
  // null outside a hosted deployment
  const hosting = use(HostingContext);

  if (!chunk) return "Source";

  if (hosting?.citationMetadataPath) {
    const label = resolveMetadataPath(chunk, hosting.citationMetadataPath);
    if (label) return label;
  }

  return chunk.filename ?? "Source";
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
 * Pill-style citation: one citation can reference multiple chunks, resolved
 * by id from the conversation's tool outputs.
 */
export function ChunksCitationModal({ chunks }: { chunks: FormattedChunk[] }) {
  const label = useCitationLabel(chunks[0]);

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
