import { Streamdown } from "streamdown";

import { CitationButton } from "./citation-button";
import remarkCitations from "./remark-citations";

interface MarkdownProps {
  children: string;
  annotations?: Array<Record<string, unknown>>;
}

const remarkPlugins = [remarkCitations];

export const Markdown = ({ children, annotations }: MarkdownProps) => {
  return (
    <Streamdown
      remarkPlugins={remarkPlugins}
      components={{
        // @ts-ignore
        citation: ({ node: _, ...props }) => (
          <CitationButton {...props} annotations={annotations} />
        ),
      }}
    >
      {children}
    </Streamdown>
  );
};
