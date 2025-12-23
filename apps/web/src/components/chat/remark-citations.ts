import type { Root, RootContent } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

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
