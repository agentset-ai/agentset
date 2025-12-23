import type { Root, RootContent } from "mdast";
import type { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";

interface CitationNode {
  type: "citation";
  value: string;
  citationId: string;
  data: {
    hName: "citation";
    hProperties: {
      className: string;
      "data-citation": string;
    };
    hChildren: [{ type: "text"; value: string }];
  };
}

declare module "mdast" {
  interface StaticPhrasingContentMap {
    citation: CitationNode;
  }
}

const CITATION_REGEX = /\[ref:([^\]]+)\]/g;

const remarkCitations: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "text", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;

      const parts: (string | CitationNode)[] = [];
      let lastIndex = 0;
      let match;

      const nodeValue = node.value || "";

      // Reset regex state before using it
      CITATION_REGEX.lastIndex = 0;

      while ((match = CITATION_REGEX.exec(nodeValue)) !== null) {
        // Add text before the citation
        if (match.index > lastIndex) {
          parts.push(nodeValue.slice(lastIndex, match.index));
        }

        // Add the citation node
        const citationId = match[1]!;

        parts.push({
          type: "citation",
          value: match[0],
          citationId,
          data: {
            hName: "citation",
            hProperties: {
              className: "cursor-pointer text-blue-500 hover:underline",
              "data-citation": citationId,
            },
            hChildren: [{ type: "text", value: match[0] }],
          },
        });

        lastIndex = match.index + match[0].length;
      }

      // Add any remaining text
      if (lastIndex < nodeValue.length) {
        parts.push(nodeValue.slice(lastIndex));
      }

      if (parts.length > 1) {
        // Replace the current node with the array of text and citation nodes
        const newNodes = parts.map((part) =>
          typeof part === "string" ? { type: "text", value: part } : part,
        ) as RootContent[];

        parent.children.splice(index, 1, ...newNodes);

        // Return the index after the newly inserted nodes to continue traversal
        // This prevents re-visiting the nodes we just inserted
        return [SKIP, index + newNodes.length];
      }
    });
  };
};

export default remarkCitations;
