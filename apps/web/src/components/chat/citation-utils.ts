/**
 * Resolves a citation name from metadata using a dot-notation path.
 * For example, if metadataPath is "document.title" and metadata is
 * { document: { title: "My Doc" } }, it returns "My Doc".
 */
export function resolveCitationName(
  metadata: Record<string, unknown> | undefined,
  metadataPath: string | null | undefined,
): string | null {
  if (!metadataPath || !metadata) return null;

  const path = metadataPath.split(".");
  let value: unknown = metadata;

  for (const key of path) {
    if (
      value === null ||
      typeof value !== "object" ||
      typeof value === "undefined"
    ) {
      return null;
    }
    value = (value as Record<string, unknown>)[key];
  }

  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value ? "True" : "False";

  return null;
}

export interface ResolvedCitation {
  index: number; // 1-based index
  name: string | null;
  source: { text: string; metadata?: Record<string, unknown> } | undefined;
}

/**
 * Formats the display text for a group of citations.
 *
 * Rules:
 * - Single unnamed: "Source x"
 * - Single named: name as-is
 * - Multiple unnamed: "<count> Sources"
 * - Multiple named or mixed: "Name1, Name2 | +<rest>" (max 2 unique names shown)
 * - Duplicate names are only shown once but still counted in the total
 */
export function formatCitationDisplay(citations: ResolvedCitation[]): string {
  // Filter out citations with missing sources
  const validCitations = citations.filter((c) => c.source !== undefined);

  if (validCitations.length === 0) {
    // Fallback if all sources are missing
    return citations.length === 1
      ? `Source ${citations[0]?.index ?? "?"}`
      : `${citations.length} Sources`;
  }

  if (validCitations.length === 1) {
    const citation = validCitations[0]!;
    return citation.name ?? `Source ${citation.index}`;
  }

  // Multiple citations
  const named = validCitations.filter((c) => c.name !== null);

  if (named.length === 0) {
    // All unnamed
    return `${validCitations.length} Sources`;
  }

  // Get unique names while preserving order of first occurrence
  const uniqueNames: string[] = [];
  const seenNames = new Set<string>();
  for (const citation of named) {
    if (citation.name && !seenNames.has(citation.name)) {
      seenNames.add(citation.name);
      uniqueNames.push(citation.name);
    }
  }

  // Show max 2 unique names, then count for the rest
  const maxNamesToShow = 2;
  const namesToShow = uniqueNames.slice(0, maxNamesToShow);
  // Remaining count = total citations - unique names we're showing
  const remainingCount =
    validCitations.length - Math.min(uniqueNames.length, maxNamesToShow);

  if (remainingCount > 0) {
    return `${namesToShow.join(", ")} | +${remainingCount}`;
  }

  return namesToShow.join(", ");
}
