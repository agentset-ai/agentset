import type { MyUIMessage } from "@/types/ai";

import { MessageResponse } from "@agentset/ui/ai/message";

import { CitationButton } from "./citation-button";

interface MarkdownProps {
  children: string;
  message?: MyUIMessage;
  isLoading?: boolean;
}

export const Markdown = ({ children, isLoading, message }: MarkdownProps) => {
  return (
    <MessageResponse
      allowedTags={{
        // <citation ids="..." /> tags emitted by the model
        citation: ["ids"],
      }}
      // both surfaces stream word-by-word (smoothStream) like qaf, so no
      // client-side token animation is needed
      animated={false}
      isAnimating={isLoading && message?.role === "assistant"}
      components={{
        citation: ({ node: _, ...props }) => <CitationButton {...props} />,
      }}
    >
      {children}
    </MessageResponse>
  );
};
