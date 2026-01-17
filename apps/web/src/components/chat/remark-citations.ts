import type { Root, RootContent } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

interface CitationNode {
  type: "citation";
  value: string;
  citationNumber: number;
  data: {
    hName: "citation";
    hProperties: {
      className: string;
      "data-citation": number;
    };
    hChildren: [{ type: "text"; value: string }];
  };
}

interface CitationGroupNode {
  type: "citation-group";
  value: string;
  citationNumbers: number[];
  data: {
    hName: "citation-group";
    hProperties: {
      className: string;
      "data-citations": string;
    };
    hChildren: [{ type: "text"; value: string }];
  };
}

declare module "mdast" {
  interface StaticPhrasingContentMap {
    citation: CitationNode;
    "citation-group": CitationGroupNode;
  }
}

const CITATION_REGEX = /\[(\d+)\]/g;

interface CitationMatch {
  fullMatch: string;
  number: number;
  startIndex: number;
  endIndex: number;
}

function createCitationNode(citationNumber: number): CitationNode {
  return {
    type: "citation",
    value: `[${citationNumber}]`,
    citationNumber,
    data: {
      hName: "citation",
      hProperties: {
        className: "cursor-pointer",
        "data-citation": citationNumber,
      },
      hChildren: [{ type: "text", value: `[${citationNumber}]` }],
    },
  };
}

function createCitationGroupNode(
  citationNumbers: number[],
  originalText: string,
): CitationGroupNode {
  return {
    type: "citation-group",
    value: originalText,
    citationNumbers,
    data: {
      hName: "citation-group",
      hProperties: {
        className: "cursor-pointer",
        "data-citations": citationNumbers.join(","),
      },
      hChildren: [{ type: "text", value: originalText }],
    },
  };
}

const remarkCitations: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "text", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;

      const nodeValue = node.value || "";

      // First, collect all citation matches with their positions
      const matches: CitationMatch[] = [];
      let match;

      while ((match = CITATION_REGEX.exec(nodeValue)) !== null) {
        matches.push({
          fullMatch: match[0],
          number: parseInt(match[1]!, 10),
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }

      if (matches.length === 0) return;

      // Group adjacent citations (no characters between them)
      const groups: CitationMatch[][] = [];
      let currentGroup: CitationMatch[] = [matches[0]!];

      for (let i = 1; i < matches.length; i++) {
        const prevMatch = matches[i - 1]!;
        const currMatch = matches[i]!;

        // Check if current citation is immediately after the previous one
        if (currMatch.startIndex === prevMatch.endIndex) {
          currentGroup.push(currMatch);
        } else {
          groups.push(currentGroup);
          currentGroup = [currMatch];
        }
      }
      groups.push(currentGroup);

      // Build the parts array with text and citation/citation-group nodes
      const parts: (string | CitationNode | CitationGroupNode)[] = [];
      let lastIndex = 0;

      for (const group of groups) {
        const groupStart = group[0]!.startIndex;
        const groupEnd = group[group.length - 1]!.endIndex;

        // Add text before this group
        if (groupStart > lastIndex) {
          parts.push(nodeValue.slice(lastIndex, groupStart));
        }

        // Add citation node(s)
        if (group.length === 1) {
          // Single citation
          parts.push(createCitationNode(group[0]!.number));
        } else {
          // Grouped citations
          const citationNumbers = group.map((m) => m.number);
          const originalText = nodeValue.slice(groupStart, groupEnd);
          parts.push(createCitationGroupNode(citationNumbers, originalText));
        }

        lastIndex = groupEnd;
      }

      // Add any remaining text after the last citation
      if (lastIndex < nodeValue.length) {
        parts.push(nodeValue.slice(lastIndex));
      }

      if (parts.length > 0) {
        // Replace the current node with the array of text and citation nodes
        parent.children.splice(
          index,
          1,
          ...(parts.map((part) =>
            typeof part === "string" ? { type: "text", value: part } : part,
          ) as RootContent[]),
        );
      }
    });
  };
};

export default remarkCitations;
