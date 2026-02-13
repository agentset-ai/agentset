import { BadgeDollarSignIcon, BookIcon, GraduationCapIcon } from "lucide-react";

import "@agentset/db/types";

const DEMO_TEMPLATES = {
  education: {
    id: "education",
    name: "Academic Research",
    description: "Transformer and BERT research papers.",
    icon: GraduationCapIcon,
    exampleMessages: [
      "How does BERT differ from the original Transformer?",
      "Why did the authors replace recurrence with self-attention?",
      "Compare the pre-training objectives of BERT and GPT.",
      "What benchmarks did BERT set new state-of-the-art on?",
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
    description: "NVIDIA's 2025 quarterly earnings reports.",
    icon: BadgeDollarSignIcon,
    exampleMessages: [
      "How did NVIDIA's data center revenue change across quarters?",
      "What was the gross margin trend throughout 2025?",
      "Which segments drove the most growth in Q4?",
      "What forward-looking risks did management highlight?",
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
    description:
      "OpenAI API documentation for chat, error codes, and rate limits.",
    icon: BookIcon,
    exampleMessages: [
      "How do I stream a chat completion response?",
      "What does error code 429 mean and how do I handle it?",
      "What are the rate limits for GPT-4 vs GPT-3.5?",
      "How do I use function calling with the chat API?",
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
