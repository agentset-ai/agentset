import { useMemo } from "react";
import { MyUIMessage } from "@/types/ai";

import { CitationModal } from "./citation-modal";

export const CitationButton = ({
  message,
  ...props
}: {
  children?: React.ReactNode;
  message?: MyUIMessage;
  "data-citation"?: string;
  className?: string;
}) => {
  const citationId = props["data-citation"];
  if (!props.children || !citationId || !message) return null;

  const source = useMemo(() => {
    return (
      message.parts.find((a) => a.type === "data-agentset-sources")?.data
        ?.results ??
      message.parts
        .filter(
          (a) =>
            a.type === "tool-semantic_search" ||
            a.type === "tool-keyword_search",
        )
        .flatMap((a) => a.output ?? [])
    ).find((a) => a.id === citationId);
  }, [message.parts, citationId]);

  if (!source) return <span {...props}>{props.children}</span>;

  return <CitationModal source={source} triggerProps={props} />;
};
