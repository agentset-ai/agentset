import { useState } from "react";

import type { QueryVectorStoreResult } from "@agentset/engine";
import { CodeBlock, CodeBlockCopyButton } from "@agentset/ui/ai/code-block";
import { Button } from "@agentset/ui/button";

const CollapsibleMetadata = ({ metadata }: { metadata: unknown }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-border mt-3 flex flex-col gap-2 border-t pt-3">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-medium">Metadata</h3>
        <Button
          variant="outline"
          size="sm"
          className="h-auto px-2 py-1 text-xs"
          onClick={() => setOpen(!open)}
        >
          {open ? "Hide" : "Show"}
        </Button>
      </div>

      {open ? (
        <CodeBlock
          code={JSON.stringify(metadata, null, 2)}
          language="json"
          className="mt-2"
        >
          <CodeBlockCopyButton />
        </CodeBlock>
      ) : null}
    </div>
  );
};

const SearchChunk = ({
  chunk,
  index,
  originalIndex,
  truncate = false,
  query,
}: {
  chunk: QueryVectorStoreResult["results"][number];
  index?: number;
  originalIndex?: number;
  truncate?: boolean;
  query?: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const text = chunk.text;
  const shouldTruncate = truncate && !expanded && text.length > 500;
  const displayText = shouldTruncate ? text.slice(0, 500) + "..." : text;

  // Highlight query matches
  // TODO: bring back highlighting
  // const highlightedText = useMemo(() => {
  //   let final = displayText;
  //   if (query && query.trim().length > 0) {
  //     try {
  //       // Split query into words, filter out empty, escape regex
  //       const words = query
  //         .split(/\s+/)
  //         .filter(Boolean)
  //         .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  //       if (words.length > 0) {
  //         // Join with | for substring match (not word boundary)
  //         const regex = new RegExp(`(${words.join("|")})`, "gi");
  //         final = displayText.replace(
  //           regex,
  //           '<mark class="bg-yellow-200">$1</mark>',
  //         );
  //       }
  //     } catch {}
  //   }

  //   return final;
  // }, [displayText, query]);

  return (
    <div className="bg-secondary rounded-md p-4">
      <div className="flex justify-between">
        <div>
          <p className="text-muted-foreground text-xs">Score: {chunk.score}</p>
          {chunk.rerankScore && (
            <p className="text-muted-foreground text-xs">
              Re-rank score: {chunk.rerankScore}
            </p>
          )}
        </div>
        {originalIndex !== undefined && index !== undefined ? (
          <div>
            <p className="text-muted-foreground text-xs">
              Original order: {originalIndex + 1}
            </p>
            <p className="text-muted-foreground text-xs">
              Current order: {index + 1}
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-2 text-sm">
        <span
          dangerouslySetInnerHTML={{
            __html: displayText.replace(/(\n)/g, "<br />"),
          }}
        />
        {shouldTruncate && (
          <Button
            size="sm"
            variant="link"
            className="ml-1 px-0"
            onClick={() => setExpanded(true)}
          >
            See more
          </Button>
        )}
      </div>

      {chunk.metadata && <CollapsibleMetadata metadata={chunk.metadata} />}
    </div>
  );
};

export default SearchChunk;
