import { memo } from "react";
import { logEvent } from "@/lib/analytics";
import { useChatMessageCount } from "ai-sdk-zustand";
import { motion } from "motion/react";

import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";

interface SuggestedActionsProps {
  exampleMessages: readonly string[];
  /** Fills the composer so the user can adjust before sending. */
  onSelect: (text: string) => void;
  /** Fades the suggestions out once the composer has content. */
  hidden?: boolean;
}

function PureSuggestedActions({
  exampleMessages,
  onSelect,
  hidden,
}: SuggestedActionsProps) {
  const totalMessages = useChatMessageCount();

  if (totalMessages > 0) return null;

  return (
    <div
      // `inert` also drops the faded buttons from the tab order and
      // accessibility tree.
      inert={hidden}
      className={cn(
        "grid w-full gap-2 transition-opacity duration-150 sm:grid-cols-2",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      {exampleMessages.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-${index}`}
          className={index > 1 ? "hidden sm:block" : "block"}
        >
          <Button
            variant="ghost"
            onClick={() => {
              logEvent("chat_suggested_action_clicked", {
                position: index,
              });
              onSelect(suggestedAction);
            }}
            title={suggestedAction}
            className="line-clamp-1 h-auto w-full min-w-0 flex-1 items-start justify-start gap-1 rounded-xl border px-4 py-3.5 text-left text-sm overflow-ellipsis sm:flex-col"
          >
            {suggestedAction}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions);
