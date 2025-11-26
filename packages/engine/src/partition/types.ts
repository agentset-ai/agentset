export interface ParseOptions {
  /** Force OCR on the document, even if selectable text exists. */
  force_ocr?: boolean;

  /** Enable line formatting, including math and styles detection. */
  format_lines?: boolean;

  /**
   * Strip existing OCR text from the PDF and re-run OCR.
   * Ignored if force_ocr is set.
   */
  strip_existing_ocr?: boolean;

  /**
   * Disable image extraction from the PDF.
   * If use_llm is also set, images may be automatically captioned.
   */
  disable_image_extraction?: boolean;

  /** Disable inline math recognition in OCR. */
  disable_ocr_math?: boolean;

  /**
   * Significantly improves accuracy by using an LLM to enhance tables,
   * forms, inline math, and layout detection. May increase latency.
   * Default is true.
   */
  use_llm?: boolean;

  /** Processing mode for the parser. */
  mode?: "fast" | "balanced" | "accurate";

  /** Custom prompt to use for block correction. */
  block_correction_prompt?: string;

  /**
   * Additional configuration options for marker.
   * Should be a JSON object with key-value pairs.
   * See Python docstring for supported keys.
   */
  additional_config?: Record<
    | "disable_links"
    | "keep_pageheader_in_output"
    | "keep_pagefooter_in_output"
    | "filter_blank_pages"
    | "drop_repeated_text"
    | "layout_coverage_threshold"
    | "merge_threshold"
    | "height_tolerance"
    | "gap_threshold"
    | "image_threshold"
    | "min_line_length"
    | "level_count"
    | "default_level"
    | "no_merge_tables_across_pages"
    | "force_layout_block",
    unknown
  >;
}

export interface ChunkOptions {
  chunk_size?: number; // default: 2048
  // chunk_overlap?: number; // default: 128
  // min_sentences_per_chunk?: number; // default: 1
  language_code?:
    | "af"
    | "am"
    | "ar"
    | "bg"
    | "bn"
    | "ca"
    | "cs"
    | "cy"
    | "da"
    | "de"
    | "en"
    | "es"
    | "et"
    | "fa"
    | "fi"
    | "fr"
    | "ga"
    | "gl"
    | "he"
    | "hi"
    | "hr"
    | "hu"
    | "id"
    | "is"
    | "it"
    | "jp"
    | "kr"
    | "lt"
    | "lv"
    | "mk"
    | "ms"
    | "mt"
    | "ne"
    | "nl"
    | "no"
    | "pl"
    | "pt"
    | "pt-BR"
    | "ro"
    | "ru"
    | "sk"
    | "sl"
    | "sr"
    | "sv"
    | "sw"
    | "ta"
    | "te"
    | "th"
    | "tl"
    | "tr"
    | "uk"
    | "ur"
    | "vi"
    | "zh"
    | "zu";
}
export interface PartitionBody {
  // one of url or text is required
  url?: string;
  text?: string;
  filename?: string;
  extra_metadata?: Record<string, unknown>;
  parse_options?: ParseOptions;
  chunk_options?: ChunkOptions;
  batch_size?: number; // default to 5

  trigger_token_id: string;
  trigger_access_token: string;

  namespace_id: string;
  document_id: string;
}

export type PartitionResult = {
  status: number; // 200
  metadata: {
    filename: string;
    filetype: string;
    size_in_bytes: number;
  };
  total_characters: number;
  total_chunks: number;
  total_batches: number;
  total_pages?: number;
  results_id: string;
  batch_template: string; // replace [BATCH_INDEX] with batch index
};

export type PartitionBatch = {
  id: string;
  text: string;
  metadata: {
    page_number?: number;
    sequence_number: number;
  };
}[];
