"use client";

import type { ComponentProps } from "react";
import { useCallback } from "react";
import { ArrowDownIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative flex-1 overflow-y-hidden", className)}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  />
);

export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => (
  <StickToBottom.Content
    className={cn("flex flex-col p-4", className)}
    {...props}
  />
);

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
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

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
            className={cn("rounded-full", className)}
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
