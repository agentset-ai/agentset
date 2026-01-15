import { useEffect, useState } from "react";
import { MyUIMessage } from "@/types/ai";
import { SearchIcon } from "lucide-react";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@agentset/ui/ai/chain-of-thought";

export const MessageStatus = ({
  message,
  isLoading,
}: {
  message: MyUIMessage;
  isLoading: boolean;
}) => {
  const [open, setOpen] = useState(isLoading);
  useEffect(() => {
    if (!isLoading) setOpen(false);
  }, [isLoading]);

  const statusParts = message.parts.filter(
    (p) =>
      p.type === "tool-semantic_search" ||
      p.type === "tool-keyword_search" ||
      p.type === "tool-expand",
  );

  if (statusParts.length === 0) return null;

  return (
    <ChainOfThought open={open} onOpenChange={setOpen} className="mt-4">
      <ChainOfThoughtHeader isLoading={isLoading} />
      <ChainOfThoughtContent>
        {statusParts.map((part, index) => {
          const isLast = index === statusParts.length - 1;
          return (
            <ChainOfThoughtStep
              key={part.toolCallId}
              icon={SearchIcon}
              label={
                part.type === "tool-expand"
                  ? "Expanding context..."
                  : part.input?.query
                    ? `Searching "${part.input.query}"`
                    : "Searching..."
              }
              status={isLoading && isLast ? "active" : "complete"}
            />
          );
        })}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
  // if (!status)
  //   return (
  //     <ShinyText
  //       className="w-fit font-medium"
  //       shimmerWidth={40}
  //       disabled={!isLoading}
  //     >
  //       {isLoading ? "Generating answer..." : "Done!"}
  //     </ShinyText>
  //   );

  // const queryString = queries
  //   ? queries.data.map((q, idx) => (
  //       <i key={idx}>
  //         {q}
  //         {idx < queries.data.length - 1 && ", "}
  //       </i>
  //     ))
  //   : null;

  // // TODO: Searched for 1, 2, 3, +x other terms
  // return (
  //   <ShinyText
  //     className="w-fit font-medium"
  //     shimmerWidth={status.data === "searching" ? 40 : 100}
  //     disabled={!isLoading}
  //   >
  //     {isLoading
  //       ? {
  //           "generating-queries": "Generating queries...",
  //           searching: "Searching for ",
  //           "generating-answer": "Searched for ",
  //         }[status.data]
  //       : "Searched for "}
  //     {queryString}
  //   </ShinyText>
  // );
};
