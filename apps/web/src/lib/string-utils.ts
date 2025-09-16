import { MyUIMessage } from "@/types/ai";
import { ModelMessage, UIMessage } from "ai";

import { toSlug } from "./slug";

const tokenCharacters =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const tokenCharactersLength = tokenCharacters.length;

export function generateToken(length: number) {
  let result = "";
  for (let i = 0; i < length; i++)
    result += tokenCharacters.charAt(
      Math.floor(Math.random() * tokenCharactersLength),
    );
  return result;
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length);
}

export function filenamize(value: string, length = 20) {
  const token = generateToken(4);
  const slug = toSlug(value, token);
  const hyphenCount = (slug.match(/-/g) || []).length;
  length = length + hyphenCount + token.length;

  return truncate(slug, length);
}

export function capitalize(str?: string | null) {
  if (!str || typeof str !== "string") return str;

  return str
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        (word.length > 1 ? word.slice(1).toLowerCase() : ""),
    )
    .join(" ");
}

export function camelCaseToWords(str: string) {
  return str
    .split(/(?=[A-Z])/)
    .map(capitalize)
    .join(" ");
}

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
