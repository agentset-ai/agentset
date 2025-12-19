import { useMemo } from "react";
import { useHosting, useIsHosting } from "@/contexts/hosting-context";

import { CodeBlock, CodeBlockCopyButton } from "@agentset/ui/ai/code-block";
import { cn } from "@agentset/ui/cn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agentset/ui/dialog";
import { truncate } from "@agentset/utils";

import { resolveCitationName } from "./citation-utils";

interface CitationModalProps {
  sources: Array<{ text: string; metadata?: Record<string, unknown> }>;
  sourceIndices: number[]; // 1-based indices
  displayText: string;
  triggerProps: React.ComponentProps<"button">;
}

export function CitationModal({
  sources,
  sourceIndices,
  displayText,
  triggerProps,
}: CitationModalProps) {
  const isHosting = useIsHosting();
  const hosting = isHosting ? useHosting() : null;

  // Determine the dialog title
  const dialogTitle = useMemo(() => {
    if (sources.length === 1) {
      return displayText;
    }
    return `${sources.length} Sources`;
  }, [sources.length, displayText]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          {...triggerProps}
          className={cn(
            triggerProps.className,
            "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground mx-0.5 cursor-pointer rounded-full px-2 py-0.5 text-sm font-medium hover:no-underline",
          )}
        >
          {truncate(displayText, 50, "...")}
        </button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-2xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault(); // prevents Radix from auto-focusing the first focusable
        }}
      >
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] space-y-6 overflow-y-auto">
          {sources.map((source, idx) => (
            <CitationItem
              key={sourceIndices[idx]}
              source={source}
              sourceIndex={sourceIndices[idx]!}
              metadataPath={hosting?.citationMetadataPath}
              showDivider={idx < sources.length - 1}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CitationItemProps {
  source: { text: string; metadata?: Record<string, unknown> };
  sourceIndex: number;
  metadataPath: string | null | undefined;
  showDivider: boolean;
}

function CitationItem({
  source,
  sourceIndex,
  metadataPath,
  showDivider,
}: CitationItemProps) {
  const citationName = useMemo(() => {
    return resolveCitationName(source.metadata, metadataPath);
  }, [source.metadata, metadataPath]);

  const stringifiedMetadata = useMemo(() => {
    if (!source.metadata) return null;
    try {
      return JSON.stringify(source.metadata, null, 2);
    } catch {
      return "Failed to parse metadata!";
    }
  }, [source.metadata]);

  const itemTitle = citationName ?? `Source ${sourceIndex}`;

  return (
    <div>
      <h3 className="text-sm font-semibold">{itemTitle}</h3>
      <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
        {source.text}
      </p>

      {stringifiedMetadata && (
        <div className="mt-4">
          <h4 className="text-muted-foreground text-xs font-medium">
            Metadata
          </h4>
          <div className="mt-2">
            <CodeBlock code={stringifiedMetadata} language="json">
              <CodeBlockCopyButton />
            </CodeBlock>
          </div>
        </div>
      )}

      {showDivider && <div className="border-border mt-6 border-t" />}
    </div>
  );
}
