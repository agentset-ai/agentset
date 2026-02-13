import { BadgeDollarSignIcon, BookIcon, GraduationCapIcon } from "lucide-react";

import "@agentset/db/types";

const DEMO_TEMPLATES = {
  education: {
    id: "education",
    name: "Research Paper",
    description: '"Attention Is All You Need" (2017)',
    icon: GraduationCapIcon,
    exampleMessages: [
      "What is the transformer architecture?",
      "Explain the self-attention mechanism.",
      "What are the key contributions of this paper?",
      "How does multi-head attention work?",
    ],
    ingestJob: {
      type: "BATCH",
      items: [
        {
          type: "FILE",
          fileUrl:
            "https://assets.agentset.ai/demos/academic-papers/1706.03762v7.pdf",
          fileName: "1706.03762v7.pdf",
        },
        {
          type: "FILE",
          fileUrl:
            "https://assets.agentset.ai/demos/academic-papers/1810.04805v2.pdf",
          fileName: "1810.04805v2.pdf",
        },
      ],
    } satisfies PrismaJson.IngestJobPayload,
  },
  financial: {
    id: "financial",
    name: "Financial Report",
    description: "Google's yearly earnings reports.",
    icon: BadgeDollarSignIcon,
    exampleMessages: [
      "Summarize year-over-year revenue growth.",
      "What are the major cost drivers?",
      "How did operating margins change this year?",
      "What risks are highlighted in the report?",
    ],
    ingestJob: {
      type: "BATCH",
      items: [
        {
          type: "FILE",
          fileName: "nvidia-2025-q1.pdf",
          fileUrl:
            "https://assets.agentset.ai/demos/financial-reports/nvidia-2025-q1.pdf",
        },
        {
          type: "FILE",
          fileName: "nvidia-2025-q2.pdf",
          fileUrl:
            "https://assets.agentset.ai/demos/financial-reports/nvidia-2025-q2.pdf",
        },
        {
          type: "FILE",
          fileName: "nvidia-2025-q3.pdf",
          fileUrl:
            "https://assets.agentset.ai/demos/financial-reports/nvidia-2025-q3.pdf",
        },
        {
          type: "FILE",
          fileName: "nvidia-2025-q4.pdf",
          fileUrl:
            "https://assets.agentset.ai/demos/financial-reports/nvidia-2025-q4.pdf",
        },
      ],
    } satisfies PrismaJson.IngestJobPayload,
  },
  documentation: {
    id: "documentation",
    name: "Technical Documentation",
    description: "Sample powerpoints, spreadsheets, PDFs, and more.",
    icon: BookIcon,
    exampleMessages: [
      "Summarize the quarterly business review deck.",
      "What are the top open risks and owners?",
      "List key customer commitments and due dates.",
      "What initiatives are at risk this quarter?",
    ],
    ingestJob: {
      type: "BATCH",
      items: [
        {
          type: "FILE",
          fileName: "chat.md",
          fileUrl:
            "https://assets.agentset.ai/demos/technical-documentation/chat.md",
        },
        {
          type: "FILE",
          fileName: "error-codes.md",
          fileUrl:
            "https://assets.agentset.ai/demos/technical-documentation/error-codes.md",
        },
        {
          type: "FILE",
          fileName: "rate-limits.md",
          fileUrl:
            "https://assets.agentset.ai/demos/technical-documentation/rate-limits.md",
        },
      ],
    } satisfies PrismaJson.IngestJobPayload,
  },
} as const;

export type DemoTemplateId = keyof typeof DEMO_TEMPLATES;
export type DemoTemplate = (typeof DEMO_TEMPLATES)[DemoTemplateId];

export const DEMO_TEMPLATE_LIST = Object.values(
  DEMO_TEMPLATES,
) as DemoTemplate[];

export const getDemoTemplate = (templateId: string) => {
  if (!Object.hasOwn(DEMO_TEMPLATES, templateId)) {
    return null;
  }

  return DEMO_TEMPLATES[templateId as DemoTemplateId];
};
