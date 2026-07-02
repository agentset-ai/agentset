"use client";

import type { ComponentProps, RefObject } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowDownIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";

// Distance (px) from the bottom within which the view still counts as "at
// bottom", so trailing padding doesn't surface the scroll button.
const AT_BOTTOM_THRESHOLD = 100;

// How long a programmatic scroll destination stays authoritative. Outlives
// any smooth-scroll animation; `scrollend`/arrival usually clear it sooner.
const SCROLL_TARGET_TTL_MS = 1500;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type ConversationContextValue = {
  /** The scrollable viewport element. */
  containerRef: RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  updateIsAtBottom: () => void;
  /**
   * Freeze the at-bottom state until the next `scrollToPosition` call. Call
   * this in the commit that changes the layout (e.g. appending a message)
   * when a programmatic scroll will follow a frame later, so the scroll
   * button doesn't flash through the intermediate geometry.
   */
  beginProgrammaticScroll: () => void;
  scrollToPosition: (top: number, behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
};

const ConversationContext = createContext<ConversationContextValue | null>(
  null,
);

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "Conversation components must be used within <Conversation />",
    );
  }

  return context;
};

export type ConversationProps = ComponentProps<"div"> & {
  /**
   * Jump to the bottom on mount when the content already overflows. Turn off
   * when the mount is immediately followed by an anchored scroll.
   */
  initialScrollToBottom?: boolean;
};

/**
 * Scroll container for a chat. The viewport never follows content growth:
 * streaming output stays put and the user reads at their own pace. Descendants
 * position within the conversation via `useConversation` (anchoring a sent
 * message, showing the scroll-to-bottom button).
 */
export const Conversation = ({
  className,
  children,
  initialScrollToBottom = true,
  ...props
}: ConversationProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // Destination of an in-flight programmatic scroll. While set, at-bottom is
  // judged from the destination, so the scroll button doesn't flash through
  // the animation's intermediate positions.
  const scrollTargetRef = useRef<{ top: number; setAt: number } | null>(null);
  // True between a layout change and the programmatic scroll that follows it.
  const pendingScrollRef = useRef(false);

  const currentScrollTarget = useCallback(() => {
    const target = scrollTargetRef.current;
    if (!target) return null;

    if (performance.now() - target.setAt > SCROLL_TARGET_TTL_MS) {
      scrollTargetRef.current = null;
      return null;
    }

    return target.top;
  }, []);

  const updateIsAtBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el || pendingScrollRef.current) return;

    const top = currentScrollTarget() ?? el.scrollTop;
    const distance = el.scrollHeight - top - el.clientHeight;
    setIsAtBottom(distance <= AT_BOTTOM_THRESHOLD);
  }, [currentScrollTarget]);

  const beginProgrammaticScroll = useCallback(() => {
    pendingScrollRef.current = true;
  }, []);

  // Start at the bottom when mounting with pre-existing overflow.
  const initialScrollRef = useRef(initialScrollToBottom);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !initialScrollRef.current) return;

    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(updateIsAtBottom);
    observer.observe(el);
    updateIsAtBottom();
    return () => observer.disconnect();
  }, [updateIsAtBottom]);

  const scrollToPosition = useCallback(
    (top: number, behavior?: ScrollBehavior) => {
      const el = containerRef.current;
      if (!el) return;

      const target = Math.min(
        Math.max(top, 0),
        el.scrollHeight - el.clientHeight,
      );
      pendingScrollRef.current = false;
      scrollTargetRef.current = { top: target, setAt: performance.now() };
      el.scrollTo({
        top: target,
        behavior: behavior ?? (prefersReducedMotion() ? "auto" : "smooth"),
      });
      updateIsAtBottom();
    },
    [updateIsAtBottom],
  );

  const scrollToBottom = useCallback(
    (behavior?: ScrollBehavior) => {
      const el = containerRef.current;
      if (!el) return;

      scrollToPosition(el.scrollHeight - el.clientHeight, behavior);
    },
    [scrollToPosition],
  );

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    const target = currentScrollTarget();
    if (el && target !== null && Math.abs(el.scrollTop - target) < 16) {
      scrollTargetRef.current = null;
    }
    updateIsAtBottom();
  }, [currentScrollTarget, updateIsAtBottom]);

  // Any user scroll intent cancels an in-flight programmatic scroll's claim
  // on the at-bottom state.
  const cancelScrollTarget = useCallback(() => {
    pendingScrollRef.current = false;
    scrollTargetRef.current = null;
    updateIsAtBottom();
  }, [updateIsAtBottom]);

  const contextValue = useMemo(
    () => ({
      containerRef,
      isAtBottom,
      updateIsAtBottom,
      beginProgrammaticScroll,
      scrollToPosition,
      scrollToBottom,
    }),
    [
      isAtBottom,
      updateIsAtBottom,
      beginProgrammaticScroll,
      scrollToPosition,
      scrollToBottom,
    ],
  );

  return (
    <ConversationContext.Provider value={contextValue}>
      <div
        className={cn(
          "[container-type:size] relative flex-1 overflow-y-hidden",
          className,
        )}
        {...props}
      >
        {/* The scroll button is absolutely positioned against the outer
            (relative) wrapper, so it stays put while this viewport scrolls. */}
        <div
          className="size-full overflow-y-auto"
          onScroll={handleScroll}
          onScrollEnd={cancelScrollTarget}
          onTouchStart={cancelScrollTarget}
          onWheel={cancelScrollTarget}
          ref={containerRef}
          role="log"
        >
          {children}
        </div>
      </div>
    </ConversationContext.Provider>
  );
};

export type ConversationContentProps = ComponentProps<"div">;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => {
  const { updateIsAtBottom } = useConversation();
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Content growth (streaming) never moves the viewport; it only re-evaluates
  // whether the scroll-to-bottom button should show.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver(updateIsAtBottom);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateIsAtBottom]);

  return (
    <div
      className={cn("flex flex-col p-4", className)}
      ref={contentRef}
      {...props}
    />
  );
};

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useConversation();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    <AnimatePresence>
      {!isAtBottom && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2"
        >
          <Button
            className={cn(
              "dark:bg-background dark:hover:bg-muted rounded-full",
              className,
            )}
            onClick={handleScrollToBottom}
            size="icon"
            type="button"
            variant="outline"
            {...props}
          >
            <ArrowDownIcon className="size-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
