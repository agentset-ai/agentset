import { useEffect, useState } from "react";
import { MyUIMessage } from "@/types/ai";
import {
  LucideIcon,
  MessageSquareIcon,
  PencilIcon,
  SearchIcon,
} from "lucide-react";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@agentset/ui/ai/chain-of-thought";

const STATUS_LABELS: Record<
  Extract<
    MyUIMessage["parts"][number],
    { type: "data-status" }
  >["data"]["value"],
  { label: string; icon: LucideIcon }
> = {
  "generating-queries": { label: "Generating queries...", icon: PencilIcon },
  searching: { label: "Searching...", icon: SearchIcon },
  "generating-answer": {
    label: "Generating answer...",
    icon: MessageSquareIcon,
  },
};

export const MessageStatus = ({
  message,
  isLoading,
}: {
  message: MyUIMessage;
  isLoading: boolean;
}) => {
  const [open, setOpen] = useState(isLoading);
  useEffect(() => {
    if (!isLoading) {
      setOpen(false);
    }
  }, [isLoading]);

  const statusParts = message.parts.filter((p) => p.type === "data-status");

  if (statusParts.length === 0) return null;

  return (
    <ChainOfThought open={open} onOpenChange={setOpen} className="mt-4">
      <ChainOfThoughtHeader isLoading={isLoading} />
      <ChainOfThoughtContent>
        {statusParts.map(({ data }, index) => {
          const { label, icon: Icon } = STATUS_LABELS[data.value];
          const isLast = index === statusParts.length - 1;
          return (
            <ChainOfThoughtStep
              icon={Icon}
              label={label}
              status={isLoading && isLast ? "active" : "complete"}
            >
              {data.value === "searching" ? (
                <ChainOfThoughtSearchResults className="flex-wrap">
                  {data.queries.map((query) => (
                    <ChainOfThoughtSearchResult key={query}>
                      {query}
                    </ChainOfThoughtSearchResult>
                  ))}
                </ChainOfThoughtSearchResults>
              ) : null}
            </ChainOfThoughtStep>
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
