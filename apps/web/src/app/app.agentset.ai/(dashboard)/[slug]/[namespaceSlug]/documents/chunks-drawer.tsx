"use client";

import { useMemo, useState } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { trpcClient } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { CopyIcon, SearchIcon } from "lucide-react";
import { VList } from "virtua";

import type { ChunksFile } from "@agentset/engine";
import { CodeBlock, CodeBlockCopyButton } from "@agentset/ui/ai/code-block";
import { Response } from "@agentset/ui/ai/response";
import { Button } from "@agentset/ui/button";
import { Input } from "@agentset/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@agentset/ui/sheet";
import { Spinner } from "@agentset/ui/spinner";

interface ChunksDrawerProps {
  documentId: string;
  documentName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChunksDrawer({
  documentId,
  documentName,
  open,
  onOpenChange,
}: ChunksDrawerProps) {
  const namespace = useNamespace();
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["document-chunks", namespace.id, documentId],
    queryFn: async () => {
      // First fetch the presigned URL
      const urlResponse = await trpcClient.document.getChunksDownloadUrl.mutate(
        {
          documentId,
          namespaceId: namespace.id,
        },
      );

      if (!urlResponse?.url) {
        throw new Error("Could not get chunks URL");
      }

      // Then fetch the chunks JSON
      const response = await fetch(urlResponse.url);
      if (!response.ok) {
        throw new Error("Failed to fetch chunks");
      }

      const data = (await response.json()) as ChunksFile;
      return data;
    },
    enabled: open,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const errorMessage =
    error instanceof Error ? error.message : "Failed to load chunks";

  const filteredChunks = useMemo(() => {
    if (!data?.chunks) return [];
    if (!search.trim()) return data.chunks;
    const lowerSearch = search.toLowerCase();

    const results: typeof data.chunks = [];
    for (const chunk of data.chunks) {
      if (chunk.text.toLowerCase().includes(lowerSearch)) {
        // highlight the search term in the chunk text
        const highlightedText = chunk.text.replace(
          new RegExp(lowerSearch, "gi"),
          (match) => `<span class="bg-yellow-200">${match}</span>`,
        );

        results.push({ ...chunk, text: highlightedText });
      }
    }
    return results;
  }, [data?.chunks, search]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{documentName ?? "Document Chunks"}</SheetTitle>
          <SheetDescription>View all chunks for this document</SheetDescription>
        </SheetHeader>

        <div className="flex h-full">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner className="text-muted-foreground size-8" />
            </div>
          ) : error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <p className="text-muted-foreground text-sm">{errorMessage}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : !data || data.chunks.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-muted-foreground text-sm">No chunks found</p>
            </div>
          ) : (
            <div className="flex w-full flex-1 flex-col gap-4">
              <div className="flex w-full flex-col gap-4 px-4">
                <DocumentMetadata metadata={data.metadata} />

                <div className="relative">
                  <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    placeholder="Search chunks..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <p className="text-muted-foreground text-sm">
                  {search
                    ? `${filteredChunks.length} of ${data.chunks.length} chunk${data.chunks.length !== 1 ? "s" : ""}`
                    : `${data.chunks.length} chunk${data.chunks.length !== 1 ? "s" : ""}`}
                </p>
              </div>

              {filteredChunks.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-muted-foreground text-sm">
                    No chunks match your search
                  </p>
                </div>
              ) : (
                <VList className="flex-1 px-4">
                  {filteredChunks.map((chunk, index) => (
                    <ChunkItem key={chunk.id} chunk={chunk} index={index} />
                  ))}
                </VList>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DocumentMetadata({ metadata }: { metadata: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-muted/50 border-border flex w-full flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium">Document Metadata</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-1 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Collapse" : "Expand"}
        </Button>
      </div>

      {expanded && (
        <div className="w-full flex-1">
          <CodeBlock code={JSON.stringify(metadata, null, 2)} language="json">
            <CodeBlockCopyButton />
          </CodeBlock>
        </div>
      )}
    </div>
  );
}

function ChunkItem({
  chunk,
  index,
}: {
  chunk: ChunksFile["chunks"][number];
  index: number;
}) {
  const [showMetadata, setShowMetadata] = useState(false);
  const hasExtraMetadata = Object.keys(chunk.metadata).length > 1;

  return (
    <>
      <div className="border-border bg-accent sticky top-0 flex w-full items-center justify-between rounded-t-md border-b-[1.5px] px-4">
        <span className="text-muted-foreground text-xs font-medium">
          #{index + 1}
          {"page_number" in chunk.metadata && (
            <span className="ml-2">
              • Page {chunk.metadata.page_number as number}
            </span>
          )}
        </span>

        <Button size="icon" variant="ghost">
          <CopyIcon className="size-3" />
        </Button>
      </div>

      <div className="bg-secondary rounded-md rounded-t-none px-4 py-4">
        <Response mode="static">{chunk.text}</Response>

        {hasExtraMetadata && (
          <div className="border-border mt-3 border-t pt-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-medium">Metadata</h3>
              <Button
                variant="outline"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => setShowMetadata(!showMetadata)}
              >
                {showMetadata ? "Hide" : "Show"}
              </Button>
            </div>

            {showMetadata && (
              <div className="mt-2">
                <CodeBlock
                  code={JSON.stringify(chunk.metadata, null, 2)}
                  language="json"
                >
                  <CodeBlockCopyButton />
                </CodeBlock>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="h-4" />
    </>
  );
}
