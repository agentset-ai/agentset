import { MyUIMessage } from "@/types/ai";
import { defaultRemarkPlugins } from "streamdown";

import { MessageResponse } from "@agentset/ui/ai/message";

import { CitationButton } from "./citation-button";
import remarkCitations from "./remark-citations";

interface MarkdownProps {
  children: string;
  message?: MyUIMessage;
  isLoading?: boolean;
}

const remarkPlugins = [remarkCitations, ...Object.values(defaultRemarkPlugins)];

export const Markdown = ({ children, isLoading, message }: MarkdownProps) => {
  return (
    <MessageResponse
      allowedTags={{
        citation: ["citationNumber"],
      }}
      animated={{ animation: "fadeIn" }}
      isAnimating={isLoading && message?.role === "assistant"}
      caret="block"
      remarkPlugins={remarkPlugins}
      components={{
        // @ts-ignore
        citation: ({ node: _, ...props }) => (
          <CitationButton {...props} message={message} />
        ),
      }}
    >
      {children}
    </MessageResponse>
  );
};
