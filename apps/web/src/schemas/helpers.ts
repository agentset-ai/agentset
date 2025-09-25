// 2) Helper to accept "red,green" or ["red","green"] and return string[]
export const csvToStringArray = (v: unknown) => {
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return [];
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(v)) return v.map(String);
  return v;
};
