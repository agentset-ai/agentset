import { MyUIMessage } from "@/types/ai";

import { CitationModal } from "./citation-modal";

export const CitationButton = ({
  message,
  citationNumber,
  ...props
}: {
  children?: React.ReactNode;
  message?: MyUIMessage;
  citationNumber?: number;
  className?: string;
}) => {
  if (!props.children) return null;

  const idx = citationNumber ? citationNumber - 1 : undefined;

  const sources = message?.parts.find((a) => a.type === "data-agentset-sources")
    ?.data?.results;

  if (idx === undefined || !sources || !sources[idx])
    return <span {...props}>{props.children}</span>;

  return (
    <CitationModal
      source={sources[idx]}
      sourceIndex={idx + 1}
      triggerProps={props}
    />
  );
};
