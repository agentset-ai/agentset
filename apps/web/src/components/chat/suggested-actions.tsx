"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { memo } from "react";
import { motion } from "framer-motion";

import { Button } from "@agentset/ui";

interface SuggestedActionsProps {
  append: UseChatHelpers["append"];
  exampleMessages: string[];
}

function PureSuggestedActions({
  append,
  exampleMessages,
}: SuggestedActionsProps) {
  return (
    <div
      data-testid="suggested-actions"
      className="grid w-full gap-2 sm:grid-cols-2"
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
              void append({
                role: "user",
                content: suggestedAction,
              });
            }}
            className="h-auto w-full flex-1 items-start justify-start gap-1 rounded-xl border px-4 py-3.5 text-left text-sm sm:flex-col"
          >
            {/* <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground">
              {suggestedAction.label}
            </span> */}
            {suggestedAction}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions);
