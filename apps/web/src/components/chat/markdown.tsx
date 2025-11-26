import { MyUIMessage } from "@/types/ai";

import { Response } from "@agentset/ui/ai/response";

import { CitationButton } from "./citation-button";
import remarkCitations from "./remark-citations";

interface MarkdownProps {
  children: string;
  message?: MyUIMessage;
  isLoading?: boolean;
}

const remarkPlugins = [remarkCitations];

export const Markdown = ({ children, isLoading, message }: MarkdownProps) => {
  return (
    <Response
      isAnimating={isLoading && message?.role === "assistant"}
      remarkPlugins={remarkPlugins}
      components={{
        // @ts-ignore
        citation: ({ node: _, ...props }) => (
          <CitationButton {...props} message={message} />
        ),
      }}
    >
      {children}
    </Response>
  );
};
