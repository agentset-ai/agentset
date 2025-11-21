import { z } from "zod/v4";

const languageCode = z.enum([
  "af",
  "am",
  "ar",
  "bg",
  "bn",
  "ca",
  "cs",
  "cy",
  "da",
  "de",
  "en",
  "es",
  "et",
  "fa",
  "fi",
  "fr",
  "ga",
  "gl",
  "he",
  "hi",
  "hr",
  "hu",
  "id",
  "is",
  "it",
  "jp",
  "kr",
  "lt",
  "lv",
  "mk",
  "ms",
  "mt",
  "ne",
  "nl",
  "no",
  "pl",
  "pt",
  "pt-BR",
  "ro",
  "ru",
  "sk",
  "sl",
  "sr",
  "sv",
  "sw",
  "ta",
  "te",
  "th",
  "tl",
  "tr",
  "uk",
  "ur",
  "vi",
  "zh",
  "zu",
]);

export const baseConfigSchema = z.object({
  chunkSize: z.coerce
    .number()
    .describe(
      "Chunk size (in characters). Controls approximately how much text is included in each chunk.",
    )
    .optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .describe(
      "Custom metadata to be added to the ingested documents. It cannot contain nested objects; only primitive types (string, number, boolean) are allowed.",
    )
    .optional(),
  languageCode: languageCode
    .describe(
      "Language code to use for text processing (for example, `en`, `fr`, or `pt-BR`). When omitted, the partition API will attempt to detect the language automatically.",
    )
    .optional(),
  forceOcr: z
    .boolean()
    .describe(
      "Force OCR on the document even if selectable text exists. Useful for scanned documents with unreliable embedded text.",
    )
    .optional(),
  mode: z
    .enum(["fast", "balanced", "accurate"])
    .meta({
      id: "mode",
      description:
        "Processing mode for the parser. `fast` favors speed, `accurate` favors quality and layout fidelity, and `balanced` offers a compromise between the two.",
    })
    .optional(),
  disableImageExtraction: z
    .boolean()
    .describe(
      "Disable image extraction from the document. When combined with `useLlm`, images may still be automatically captioned by the partition API.",
    )
    .optional(),
  disableOcrMath: z
    .boolean()
    .describe(
      "Disable inline math recognition in OCR. This can be useful if the document contains content that is frequently misclassified as math.",
    )
    .optional(),
  useLlm: z
    .boolean()
    .describe(
      "Enable LLM-assisted parsing to improve tables, forms, inline math, and layout detection. May increase latency and token usage.",
    )
    .optional(),

  // DEPRECATED PARAMS
  /**
   * @deprecated We no longer support this option.
   */
  chunkOverlap: z.coerce
    .number()
    .meta({
      description:
        "Custom chunk overlap (in characters) between consecutive chunks. Helps preserve context across chunk boundaries.",
      deprecated: true,
      "x-speakeasy-deprecation-message":
        "We no longer support this option. Use `chunkSize` instead.",
    })
    .optional(),

  /**
   * @deprecated Use `chunkSize` instead.
   */
  maxChunkSize: z.coerce
    .number()
    .meta({
      description:
        "[Deprecated] Hard chunk size. This option is ignored by the current partition pipeline and kept only for backwards compatibility.",
      deprecated: true,
      "x-speakeasy-deprecation-message":
        "We no longer support this option. Use `chunkSize` instead.",
    })
    .optional(),

  /**
   * @deprecated Use `chunkingStrategy` instead.
   */
  chunkingStrategy: z
    .enum(["basic", "by_title"])
    .meta({
      id: "chunking-strategy",
      description:
        "[Deprecated] The legacy chunking strategy. This option is ignored by the current partition pipeline and kept only for backwards compatibility.",
      deprecated: true,
      "x-speakeasy-deprecation-message": "We no longer support this option.",
    })
    .optional(),

  /**
   * @deprecated Use `mode` instead.
   */
  strategy: z
    .enum(["auto", "fast", "hi_res", "ocr_only"])
    .meta({
      id: "strategy",
      description:
        "[Deprecated] Legacy processing strategy used by the previous partition API. This option is ignored by the current pipeline and kept only for backwards compatibility.",
      deprecated: true,
      "x-speakeasy-deprecation-message":
        "We no longer support this option. Use `mode` instead.",
    })
    .optional(),
});
