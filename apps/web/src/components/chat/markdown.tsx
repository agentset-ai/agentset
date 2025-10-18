import { MyUIMessage } from "@/types/ai";

import { Response } from "@agentset/ui/ai/response";

import { CitationButton } from "./citation-button";
import remarkCitations from "./remark-citations";

interface MarkdownProps {
  children: string;
  message?: MyUIMessage;
}

const remarkPlugins = [remarkCitations];

export const Markdown = ({ children, message }: MarkdownProps) => {
  return (
    <Response
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
