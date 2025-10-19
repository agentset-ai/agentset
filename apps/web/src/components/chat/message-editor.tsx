import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import { extractTextFromParts } from "@/lib/string-utils";
import { MyUIMessage } from "@/types/ai";
import { useChatProperty } from "ai-sdk-zustand";

import { Button } from "@agentset/ui/button";
import { Textarea } from "@agentset/ui/textarea";

export type MessageEditorProps = {
  message: MyUIMessage;
  setMode: Dispatch<SetStateAction<"view" | "edit">>;
};

export function MessageEditor({ message, setMode }: MessageEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const setMessages = useChatProperty((s) => s.setMessages);
  const regenerate = useChatProperty((s) => s.regenerate);

  const [draftContent, setDraftContent] = useState<string>(
    extractTextFromParts(message.parts),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    adjustHeight();
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <Textarea
        data-testid="message-editor"
        ref={textareaRef}
        className="w-full resize-none overflow-hidden rounded-xl bg-transparent !text-base outline-none"
        value={draftContent}
        onChange={handleInput}
      />

      <div className="flex flex-row justify-end gap-2">
        <Button
          variant="outline"
          className="h-fit px-3 py-2"
          onClick={() => {
            setMode("view");
          }}
        >
          Cancel
        </Button>
        <Button
          data-testid="message-editor-send-button"
          variant="default"
          className="h-fit px-3 py-2"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);

            setMessages((messages) => {
              const index = messages.findIndex((m) => m.id === message.id);

              if (index !== -1) {
                const updatedMessage: MyUIMessage = {
                  ...message,
                  parts: [{ type: "text", text: draftContent }],
                };

                return [...messages.slice(0, index), updatedMessage];
              }

              return messages;
            });

            setMode("view");
            void regenerate();
          }}
        >
          {isSubmitting ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
