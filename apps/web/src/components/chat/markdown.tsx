// import type { Pluggable } from "unified";
// import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { MyUIMessage } from "@/types/ai";
import { defaultRehypePlugins, defaultRemarkPlugins } from "streamdown";

import { Response } from "@agentset/ui/ai/response";

import { CitationButton } from "./citation-button";
import remarkCitations from "./remark-citations";

interface MarkdownProps {
  children: string;
  message?: MyUIMessage;
  isLoading?: boolean;
}

const remarkPlugins = [remarkCitations, ...Object.values(defaultRemarkPlugins)];
const rehypePlugins = [
  ...Object.entries(defaultRehypePlugins)
    .filter(([key]) => key !== "sanitize")
    .map(([, value]) => value),
  // [
  //   rehypeSanitize,
  //   {
  //     ...defaultSchema,
  //     tagNames: ["citation", ...(defaultSchema.tagNames || [])],
  //     attributes: {
  //       ...defaultSchema.attributes,
  //       citation: ["data-citation"],
  //     },
  //   },
  // ] satisfies Pluggable,
];

export const Markdown = ({ children, isLoading, message }: MarkdownProps) => {
  return (
    <Response
      isAnimating={isLoading && message?.role === "assistant"}
      // caret={isLoading && message?.role === "assistant" ? "block" : undefined}
      // className="*:last:after:animate-caret-blink"
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
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
