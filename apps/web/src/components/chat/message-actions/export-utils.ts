import type { MyUIMessage } from "@/types/ai";
import { extractTextFromParts } from "@/lib/string-utils";

interface ExportedMessage {
  id: string;
  role: string;
  content: string;
}

interface ChatExport {
  exportedAt: string;
  title: string;
  messageCount: number;
  messages: ExportedMessage[];
}

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function formatChatAsJson(messages: MyUIMessage[]): string {
  const exportData: ChatExport = {
    title: "Chat Export",
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: extractTextFromParts(msg.parts),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

export function formatChatAsMarkdown(messages: MyUIMessage[]): string {
  const markdownContent = `# Chat Export
*Exported on ${new Date().toLocaleString()}*

---

${messages
  .map((msg) => {
    const role = msg.role === "user" ? "👤 You" : "🤖 Assistant";
    const content = extractTextFromParts(msg.parts);
    return `## ${role}:\n${content}`;
  })
  .join("\n\n---\n\n")}
`;

  return markdownContent;
}
