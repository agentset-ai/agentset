import { z } from "zod/v4";

import { languageCode } from "../language";

export const baseConfigSchema = z.object({
  chunkSize: z
    .int()
    .min(32)
    .describe(
      "Chunk size (in characters). Controls approximately how much text is included in each chunk. Defaults to `2048`.",
    )
    .optional(),
  delimiter: z
    .string()
    .describe("Delimiter to use for separating text before chunking.")
    .optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .describe(
      "Custom metadata to be added to the ingested documents. It cannot contain nested objects; only primitive types (string, number, boolean) are allowed.",
    )
    .optional(),
  languageCode: languageCode
    .describe(
      "Language code to use for text processing (for example, `en`, `ar`, or `fr`). When omitted, the partition API will attempt to detect the language automatically.",
    )
    .optional(),
  mode: z
    .enum(["fast", "balanced", "accurate"])
    .meta({
      id: "mode",
      description:
        "Processing mode for the parser. `fast` favors speed, `accurate` (pro subscription only) favors quality and layout fidelity, and `balanced` offers a compromise between the two. Defaults to `balanced`.",
    })
    .optional(),
  disableImageExtraction: z
    .boolean()
    .describe(
      "Disable image extraction from the document. When combined with `useLlm`, images may still be automatically captioned by the partition API. Defaults to `false`.",
    )
    .optional(),
  disableImageCaptions: z
    .boolean()
    .describe(
      "Disable synthetic image captions/descriptions in output. Images will be rendered as plain img tags without alt text. Defaults to `false`.",
    )
    .optional(),
  chartUnderstanding: z
    .boolean()
    .describe(
      "Enable chart understanding. This will extract the data from the charts in the document. Defaults to `false`.",
    )
    .optional(),
  keepPageheaderInOutput: z
    .boolean()
    .describe("Keep the page header in the output. Defaults to `false`.")
    .optional(),
  keepPagefooterInOutput: z
    .boolean()
    .describe("Keep the page footer in the output. Defaults to `false`.")
    .optional(),
  // DEPRECATED PARAMS
  /**
   * @deprecated We no longer support this option.
   */
  forceOcr: z
    .boolean()
    .meta({
      description:
        "Force OCR on the document even if selectable text exists. Useful for scanned documents with unreliable embedded text. Defaults to `false`.",
      deprecated: true,
      "x-speakeasy-deprecation-message": "We no longer support this option.",
    })
    .optional(),

  /**
   * @deprecated We no longer support this option.
   */
  disableOcrMath: z
    .boolean()
    .meta({
      description:
        "Disable inline math recognition in OCR. This can be useful if the document contains content that is frequently misclassified as math. Defaults to `false`.",
      deprecated: true,
      "x-speakeasy-deprecation-message": "We no longer support this option.",
    })
    .optional(),

  /**
   * @deprecated We no longer support this option.
   */
  useLlm: z
    .boolean()
    .meta({
      description:
        "Enable LLM-assisted parsing to improve tables, forms, inline math, and layout detection. May increase latency and token usage. Defaults to `true`.",
      deprecated: true,
      "x-speakeasy-deprecation-message":
        "We no longer support this option. Use `mode` instead.",
    })
    .optional(),

  /**
   * @deprecated We no longer support this option.
   */
  chunkOverlap: z.coerce
    .number()
    .meta({
      description:
        "[Deprecated] Custom chunk overlap (in characters) between consecutive chunks. Helps preserve context across chunk boundaries.",
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
      description:
        "[Deprecated] Legacy processing strategy used by the previous partition API. This option is ignored by the current pipeline and kept only for backwards compatibility.",
      deprecated: true,
      "x-speakeasy-deprecation-message":
        "We no longer support this option. Use `mode` instead.",
    })
    .optional(),
});
