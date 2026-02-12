export const DEMO_TEMPLATES = {
  education: {
    id: "education",
    name: "Research Paper",
    slug: "research-paper-demo",
    description: '"Attention Is All You Need" (2017)',
    icon: "education",
    exampleMessages: [
      "What is the transformer architecture?",
      "Explain the self-attention mechanism.",
      "What are the key contributions of this paper?",
      "How does multi-head attention work?",
    ],
  },
  financial: {
    id: "financial",
    name: "Financial Report",
    slug: "financial-report-demo",
    description: "Google's yearly earnings reports.",
    icon: "financial",
    exampleMessages: [
      "Summarize year-over-year revenue growth.",
      "What are the major cost drivers?",
      "How did operating margins change this year?",
      "What risks are highlighted in the report?",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise Data",
    slug: "enterprise-data-demo",
    description: "Sample powerpoints, spreadsheets, PDFs, and more.",
    icon: "enterprise",
    exampleMessages: [
      "Summarize the quarterly business review deck.",
      "What are the top open risks and owners?",
      "List key customer commitments and due dates.",
      "What initiatives are at risk this quarter?",
    ],
  },
} as const;

export type DemoTemplateId = keyof typeof DEMO_TEMPLATES;
export type DemoTemplate = (typeof DEMO_TEMPLATES)[DemoTemplateId];
export type DemoTemplateIcon = DemoTemplate["icon"];

export const DEMO_TEMPLATE_LIST = Object.values(
  DEMO_TEMPLATES,
) as DemoTemplate[];

export const getDemoTemplate = (templateId: string) => {
  if (!Object.hasOwn(DEMO_TEMPLATES, templateId)) {
    return null;
  }

  return DEMO_TEMPLATES[templateId as DemoTemplateId];
};
