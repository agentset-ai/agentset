import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { MyUIMessage } from "@/types/ai";
import { useChatMessages, useChatStatus } from "ai-sdk-zustand";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  useConversation,
} from "@agentset/ui/ai/conversation";
import { cn } from "@agentset/ui/cn";

import { ChatLoadingState } from "./chat-loading-state";
import { PreviewMessage } from "./message";
import { useChatScroll } from "./use-chat-scroll";

// Gap (px) kept between the top of the conversation viewport and an anchored
// exchange. Matches the list's top padding (pt-4).
const ANCHOR_TOP_OFFSET = 16;

interface Turn {
  id: string;
  messages: MyUIMessage[];
}

// One exchange: a user message plus the assistant messages that answer it.
// The last turn reserves a viewport of space (100cqh, sized by the
// Conversation container) so the sent message can anchor near the top while
// the answer streams in below.
function groupIntoTurns(messages: MyUIMessage[]): Turn[] {
  const turns: Turn[] = [];

  for (const message of messages) {
    const currentTurn = turns.at(-1);
    if (message.role === "user" || !currentTurn) {
      turns.push({ id: message.id, messages: [message] });
    } else {
      currentTurn.messages.push(message);
    }
  }

  return turns;
}

function PureMessages() {
  const { anchorVersion } = useChatScroll();
  // When mounting because of a just-sent message, the anchor scroll owns
  // positioning; jumping to the bottom first would flash the wrong position.
  const mountedWithAnchorPending = useRef(anchorVersion > 0).current;

  return (
    <Conversation
      className="flex min-w-0 flex-1 pt-4"
      initialScrollToBottom={!mountedWithAnchorPending}
    >
      <MessageTurns />
      <ConversationScrollButton />
    </Conversation>
  );
}

function MessageTurns() {
  const messages = useChatMessages<MyUIMessage>();
  const status = useChatStatus();
  const { containerRef, scrollToPosition, beginProgrammaticScroll } =
    useConversation();
  const { anchorVersion } = useChatScroll();
  const lastTurnRef = useRef<HTMLDivElement | null>(null);

  const turns = useMemo(() => groupIntoTurns(messages), [messages]);
  const lastMessageId = messages.at(-1)?.id;

  // Freeze the scroll button in the commit that appends the new turn, before
  // its layout shift is observed; the anchor scroll below unfreezes it.
  useLayoutEffect(() => {
    if (anchorVersion === 0) return;
    beginProgrammaticScroll();
  }, [anchorVersion, beginProgrammaticScroll]);

  // One-shot scroll per anchor request: wait for the just-sent message to lay
  // out, then place its turn near the top. No scrolling on stream chunks.
  useEffect(() => {
    if (anchorVersion === 0) return;

    let secondFrame: number;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const container = containerRef.current;
        const turn = lastTurnRef.current;
        if (!container || !turn) return;

        const offset =
          turn.getBoundingClientRect().top -
          container.getBoundingClientRect().top;
        scrollToPosition(container.scrollTop + offset - ANCHOR_TOP_OFFSET);
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [anchorVersion, containerRef, scrollToPosition]);

  return (
    <ConversationContent className="gap-6 pb-8">
      {turns.map((turn, index) => {
        const isLastTurn = index === turns.length - 1;

        return (
          <div
            key={turn.id}
            ref={isLastTurn ? lastTurnRef : undefined}
            className={cn(
              "flex flex-col gap-6",
              // Reserve space for the anchored exchange: viewport height
              // minus the anchor gap above and below (2 * 16px).
              isLastTurn && "min-h-[calc(100cqh-2rem)]",
            )}
          >
            {turn.messages.map((message) => (
              <PreviewMessage
                key={message.id}
                message={message}
                isLoading={
                  status === "streaming" && message.id === lastMessageId
                }
              />
            ))}

            {isLastTurn && status === "submitted" && <ChatLoadingState />}
          </div>
        );
      })}
    </ConversationContent>
  );
}

export const Messages = memo(PureMessages);
