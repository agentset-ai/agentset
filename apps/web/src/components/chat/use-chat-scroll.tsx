"use client";

import { useCallback } from "react";

import { useMessageScroller } from "@agentset/ui/ai/message-scroller";

// Anchored messages pin directly against the list's top padding, with none of
// the previous exchange peeking above them.
export const SCROLL_PREVIOUS_ITEM_PEEK = 0;

/**
 * Anchor an already-mounted message near the top of the viewport, the same way
 * the scroller anchors a newly sent message automatically. Edit and regenerate
 * need this because they rewrite the exchange in place instead of appending a
 * new anchor item; the two-frame delay lets that rewrite commit and lay out
 * before the scroll target is measured.
 */
export function useAnchorMessage() {
  const { scrollToMessage } = useMessageScroller();

  return useCallback(
    (messageId: string) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToMessage(messageId, { align: "start" });
        });
      });
    },
    [scrollToMessage],
  );
}
