import type { MyUIMessage } from "@/types/ai";
import { memo } from "react";
import { useChatMessages, useChatStatus } from "ai-sdk-zustand";

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@agentset/ui/ai/message-scroller";

import { ChatLoadingState } from "./chat-loading-state";
import { PreviewMessage } from "./message";
import { SCROLL_PREVIOUS_ITEM_PEEK } from "./use-chat-scroll";

function PureMessages() {
  const messages = useChatMessages<MyUIMessage>();
  const status = useChatStatus();
  const lastMessageId = messages.at(-1)?.id;

  return (
    // User messages are scroll anchors: sending pins the message near the top
    // of the viewport and the answer streams into the reserved space below,
    // without the view ever following the stream (autoScroll stays off).
    <MessageScrollerProvider
      defaultScrollPosition="last-anchor"
      scrollPreviousItemPeek={SCROLL_PREVIOUS_ITEM_PEEK}
    >
      <MessageScroller className="min-w-0 flex-1 pt-4">
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-6 p-4 pb-8">
            {messages.map((message) => (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={message.role === "user"}
              >
                <PreviewMessage
                  message={message}
                  isLoading={
                    status === "streaming" && message.id === lastMessageId
                  }
                />

                {/* Inside the item, not a sibling: the scroller tracks
                    Content's direct children, and swapping a sibling
                    placeholder for the first assistant item in one commit
                    would trip its replaced-anchor fallback. */}
                {message.id === lastMessageId && status === "submitted" && (
                  <div className="mt-6">
                    <ChatLoadingState />
                  </div>
                )}
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        <MessageScrollerButton
          className="dark:bg-background dark:hover:bg-muted rounded-full"
          variant="outline"
          size="icon"
        />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

export const Messages = memo(PureMessages);
