import { MyUIMessage } from "@/types/ai";
import { Streamdown } from "streamdown";

import { CitationButton } from "./citation-button";
import remarkCitations from "./remark-citations";

interface MarkdownProps {
  children: string;
  message?: MyUIMessage;
}

const remarkPlugins = [remarkCitations];

export const Markdown = ({ children, message }: MarkdownProps) => {
  return (
    <Streamdown
      remarkPlugins={remarkPlugins}
      components={{
        // @ts-ignore
        citation: ({ node: _, ...props }) => (
          <CitationButton {...props} message={message} />
        ),
      }}
    >
      {children}
    </Streamdown>
  );
};
