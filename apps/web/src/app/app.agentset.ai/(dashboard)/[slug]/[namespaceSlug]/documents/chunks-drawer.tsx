"use client";

import { useMemo, useState } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { trpcClient } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, CopyIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { VList } from "virtua";

import type { ChunksFile } from "@agentset/engine";
import { CodeBlock, CodeBlockCopyButton } from "@agentset/ui/ai/code-block";
import { Response } from "@agentset/ui/ai/response";
import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import { Input } from "@agentset/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@agentset/ui/sheet";
import { Skeleton } from "@agentset/ui/skeleton";
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
      <SheetContent side="right" className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader className="pb-0">
          <SheetTitle>{documentName ?? "Document Chunks"}</SheetTitle>
        </SheetHeader>

        <DocumentMetadata metadata={data?.metadata} isLoading={isLoading} />

        <div className="relative mx-4 mt-5">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : data ? (
            <>
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder={`Search ${data?.chunks.length} chunks...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </>
          ) : null}
        </div>

        <div className="mt-6 flex h-full">
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
              {filteredChunks.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-muted-foreground text-sm">
                    No chunks match your search
                  </p>
                </div>
              ) : (
                <VList className="flex-1 px-4">
                  {filteredChunks.map((chunk, index) => (
                    <ChunkItem
                      key={chunk.id}
                      chunk={{
                        ...chunk,
                        metadata: {
                          ...data?.metadata,
                          ...chunk.metadata,
                        },
                      }}
                      index={index}
                    />
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

function DocumentMetadata({
  metadata,
  isLoading,
}: {
  metadata?: Record<string, unknown>;
  isLoading?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-1 px-4">
      <button
        className="text-muted-foreground flex items-center gap-1 text-sm"
        onClick={() => setExpanded(!expanded)}
        disabled={isLoading}
      >
        {expanded ? "Hide" : "View"} Document Metadata
        <ChevronDownIcon
          className={cn(
            "size-4 transition-transform",
            expanded ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {expanded && (
        <div className="w-full flex-1">
          <CodeBlock
            code={JSON.stringify(metadata, null, 2)}
            language="json"
            className="mt-1"
          >
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

  return (
    <>
      <div className="border-border bg-accent sticky top-0 z-10 rounded-t-md border-b-[1.5px] px-4 py-3">
        <div className="flex w-full items-center justify-between">
          <span className="text-muted-foreground text-sm font-medium">
            #{index + 1}
            {"page_number" in chunk.metadata && (
              <span className="ml-2">
                • Page {chunk.metadata.page_number as number}
              </span>
            )}
          </span>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowMetadata(!showMetadata)}
            >
              {showMetadata ? "Hide" : "View"} Metadata
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(chunk.text);
                  toast.success("Copied to clipboard");
                } catch (error) {
                  toast.error("Failed to copy to clipboard");
                }
              }}
            >
              <CopyIcon className="size-4" />
            </Button>
          </div>
        </div>

        {showMetadata && (
          <CodeBlock
            code={JSON.stringify(chunk.metadata, null, 2)}
            language="json"
            className="mt-2"
          >
            <CodeBlockCopyButton />
          </CodeBlock>
        )}
      </div>

      <div className="bg-secondary rounded-md rounded-t-none px-4 py-4">
        <Response mode="static">{chunk.text}</Response>
      </div>
      <div className="h-4" />
    </>
  );
}
