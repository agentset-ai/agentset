import type { QueryVectorStoreResult } from "@agentset/engine";

import { CitationModal } from "./citation-modal";

export const CitationButton = ({
  annotations,
  node: _,
  ...props
}: {
  children?: React.ReactNode;
  annotations?: Array<Record<string, unknown>>;
  "data-citation"?: number;
  node?: any;
  className?: string;
}) => {
  if (!props.children) return null;

  const idx = props["data-citation"] ? props["data-citation"] - 1 : undefined;
  const sources = annotations?.find((a) => a.type === "agentset_sources")
    ?.value as QueryVectorStoreResult | undefined;

  if (idx === undefined || !sources || !sources.results[idx])
    return <span {...props}>{props.children}</span>;

  const source = sources.results[idx];

  return (
    <CitationModal source={source} sourceIndex={idx + 1} triggerProps={props} />
  );
};
