import type { FormattedChunk } from "@/lib/agentic-search/format-chunk";
import type { MyUIMessage } from "@/types/ai";
import { useMemo } from "react";
import { useChatMessages } from "ai-sdk-zustand";

import { ChunksCitationModal } from "./citation-modal";

/**
 * Renders the model-emitted <citation ids="chunk-id1,chunk-id2" /> tags. Ids
 * are resolved against the search/expand tool outputs of the whole
 * conversation, since follow-up turns may cite chunks retrieved earlier.
 */
export const CitationButton = ({ ids }: { ids?: string }) => {
  const messages = useChatMessages<MyUIMessage>();

  const chunks = useMemo(() => {
    if (!ids) return [];

    const chunkMap = new Map<string, FormattedChunk>();
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          (part.type === "tool-search" || part.type === "tool-expand") &&
          part.state === "output-available"
        ) {
          for (const chunk of part.output) {
            chunkMap.set(chunk.id, chunk);
          }
        }
      }
    }

    const seen = new Set<string>();
    const result: FormattedChunk[] = [];
    for (const rawId of ids.split(",")) {
      const id = rawId.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const chunk = chunkMap.get(id);
      if (chunk) result.push(chunk);
    }
    return result;
  }, [ids, messages]);

  if (chunks.length === 0)
    return (
      <span className="text-muted-foreground text-xs">Unknown citation</span>
    );

  return <ChunksCitationModal chunks={chunks} />;
};
