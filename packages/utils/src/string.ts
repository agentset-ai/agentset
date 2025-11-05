import slugify from "slugify";

export const validSlugRegex = new RegExp(/^[a-zA-Z0-9\-]+$/);

export const toSlug = (text: string, suffix?: string) => {
  return (
    slugify(text, {
      lower: true,
      strict: true,
      trim: true,
    }) + (suffix ? `-${suffix}` : "")
  );
};

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

export function truncate(str: string, length: number, suffix?: string) {
  if (str.length <= length) return str;
  return str.slice(0, length) + (suffix ?? "");
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
