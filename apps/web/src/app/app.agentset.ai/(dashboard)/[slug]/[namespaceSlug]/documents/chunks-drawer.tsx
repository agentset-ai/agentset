"use client";

import { useState } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { trpcClient } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { VList } from "virtua";

import type { ChunksFile } from "@agentset/engine";
import { CodeBlock, CodeBlockCopyButton } from "@agentset/ui/ai/code-block";
import { Button } from "@agentset/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@agentset/ui/sheet";

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Document Chunks</SheetTitle>
          <SheetDescription>
            {documentName ? (
              <>
                Chunks for <span className="font-medium">{documentName}</span>
              </>
            ) : (
              "View all chunks for this document"
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-[calc(100vh-10rem)] flex-col p-4">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2Icon className="text-muted-foreground size-8 animate-spin" />
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
            <>
              <p className="text-muted-foreground mb-3 text-sm">
                {data.chunks.length} chunk{data.chunks.length !== 1 ? "s" : ""}
              </p>
              <VList className="flex-1">
                {data.chunks.map((chunk, index) => (
                  <ChunkItem key={chunk.id} chunk={chunk} index={index} />
                ))}
              </VList>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
    <div className="bg-secondary mr-3 mb-3 rounded-md p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium">
          #{index + 1}
          {"page_number" in chunk.metadata && (
            <span className="ml-2">
              • Page {chunk.metadata.page_number as number}
            </span>
          )}
        </span>
      </div>

      <p className="text-sm whitespace-pre-wrap">{chunk.text}</p>

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
  );
}
