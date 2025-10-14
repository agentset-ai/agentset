import { MyUIMessage } from "@/types/ai";
import { ModelMessage } from "ai";

export function sanitizeText(text: string) {
  return text.replaceAll("<has_function_call>", "");
}

export function extractTextFromParts(
  parts: ModelMessage["content"] | MyUIMessage["parts"],
) {
  if (typeof parts === "string") return parts;
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}
