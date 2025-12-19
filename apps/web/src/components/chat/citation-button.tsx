import { useMemo } from "react";
import { useHosting, useIsHosting } from "@/contexts/hosting-context";
import { MyUIMessage } from "@/types/ai";

import { CitationModal } from "./citation-modal";
import {
  formatCitationDisplay,
  resolveCitationName,
  ResolvedCitation,
} from "./citation-utils";

interface CitationButtonProps {
  children?: React.ReactNode;
  message?: MyUIMessage;
  "data-citation"?: number; // Single citation
  "data-citations"?: string; // Grouped citations: "1,2,3"
  className?: string;
}

export const CitationButton = ({ message, ...props }: CitationButtonProps) => {
  if (!props.children) return null;

  const sources = message?.parts.find((a) => a.type === "data-agentset-sources")
    ?.data?.results;

  // Parse citation indices (1-based from props, we'll work with 0-based internally)
  const citationIndices = useMemo(() => {
    if (props["data-citations"]) {
      // Grouped citations
      return props["data-citations"].split(",").map((n) => parseInt(n, 10));
    } else if (props["data-citation"]) {
      // Single citation
      return [props["data-citation"]];
    }
    return [];
  }, [props["data-citation"], props["data-citations"]]);

  const isHosted = useIsHosting();

  if (citationIndices.length === 0 || !sources) {
    return <span {...props}>{props.children}</span>;
  }

  // Check if at least one source exists
  const hasValidSource = citationIndices.some(
    (idx) => sources[idx - 1] !== undefined,
  );

  if (!hasValidSource) {
    return <span {...props}>{props.children}</span>;
  }

  if (isHosted) {
    return (
      <HostedCitationButton
        citationIndices={citationIndices}
        sources={sources}
        triggerProps={props}
      />
    );
  }

  // Non-hosted (playground) - render simple citation button
  // For single citation, show modal; for groups in playground, show first citation's modal
  const firstIdx = citationIndices[0]! - 1;
  const firstSource = sources[firstIdx];

  if (!firstSource) {
    return <span {...props}>{props.children}</span>;
  }

  return (
    <CitationModal
      sources={[firstSource]}
      sourceIndices={[citationIndices[0]!]}
      displayText={`Source ${citationIndices[0]}`}
      triggerProps={props}
    />
  );
};

interface HostedCitationButtonProps {
  citationIndices: number[]; // 1-based indices
  sources: Array<{ text: string; metadata?: Record<string, unknown> }>;
  triggerProps: Omit<CitationButtonProps, "message">;
}

const HostedCitationButton = ({
  citationIndices,
  sources,
  triggerProps,
}: HostedCitationButtonProps) => {
  const hosting = useHosting();

  // Resolve citations with names
  const resolvedCitations: ResolvedCitation[] = useMemo(() => {
    return citationIndices.map((idx) => {
      const source = sources[idx - 1]; // Convert to 0-based
      const name = source
        ? resolveCitationName(source.metadata, hosting.citationMetadataPath)
        : null;
      return { index: idx, name, source };
    });
  }, [citationIndices, sources, hosting.citationMetadataPath]);

  // Filter valid sources for the modal
  const validSources = resolvedCitations
    .filter((c) => c.source !== undefined)
    .map((c) => c.source!);

  const validIndices = resolvedCitations
    .filter((c) => c.source !== undefined)
    .map((c) => c.index);

  // Compute display text
  const displayText = useMemo(() => {
    return formatCitationDisplay(resolvedCitations);
  }, [resolvedCitations]);

  if (validSources.length === 0) {
    return <span {...triggerProps}>{triggerProps.children}</span>;
  }

  return (
    <CitationModal
      sources={validSources}
      sourceIndices={validIndices}
      displayText={displayText}
      triggerProps={triggerProps}
    />
  );
};
