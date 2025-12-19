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

export function exportChatAsJson(
  messages: MyUIMessage[],
  title?: string,
): string {
  const exportData: ChatExport = {
    exportedAt: new Date().toISOString(),
    title: title ?? "Chat Export",
    messageCount: messages.length,
    messages: messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: extractTextFromParts(msg.parts),
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return url;
}

export function formatChatAsText(
  messages: MyUIMessage[],
  title?: string,
): string {
  const header = `${title ?? "Chat"} - Exported ${new Date().toLocaleString()}\n${"=".repeat(50)}\n\n`;

  const formatted = messages
    .map((msg) => {
      const role = msg.role === "user" ? "You" : "Assistant";
      const content = extractTextFromParts(msg.parts);
      return `[${role}]\n${content}`;
    })
    .join("\n\n---\n\n");

  return header + formatted;
}

export function exportChatAsMarkdown(
  messages: MyUIMessage[],
  title?: string,
): string {
  const markdownContent = `# ${title ?? "Chat Export"}

*Exported on ${new Date().toLocaleString()}*

---

${messages
  .map((msg) => {
    const role = msg.role === "user" ? "👤 You" : "🤖 Assistant";
    const content = extractTextFromParts(msg.parts);
    return `## ${role}\n\n${content}`;
  })
  .join("\n\n---\n\n")}
`;

  const blob = new Blob([markdownContent], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-export-${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return url;
}
