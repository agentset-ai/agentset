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
      >
        <DialogHeader>
          <DialogTitle>
            {hostingCitation || `Source [${sourceIndex}]`}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm whitespace-pre-wrap">{source.text}</p>

          {stringifiedMetadata && (
            <div className="border-border mt-6 border-t pt-6">
              <h3 className="text-xs font-medium">Metadata</h3>
              <div className="mt-2">
                <CodeBlock code={stringifiedMetadata} language="json">
                  <CodeBlockCopyButton />
                </CodeBlock>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
