export interface ParseOptions {
  /** Processing mode for the parser. */
  mode?: "fast" | "balanced" | "accurate";

  /**
   * Disable image extraction from the PDF.
   */
  disable_image_extraction?: boolean;

  /**
   * Disable synthetic image captions/descriptions in output. Images will be rendered as plain img tags without alt text or the img-description wrapper div.
   */
  disable_image_captions?: boolean;

  /**
   * Additional configuration options for marker.
   * Should be a JSON object with key-value pairs.
   * See Python docstring for supported keys.
   */
  additional_config?: Partial<
    Record<
      | "keep_pageheader_in_output"
      | "keep_pagefooter_in_output"
      | "keep_spreadsheet_formatting",
      boolean
    >
  >;

  /**
   * Comma-separated list of extras to enable. Currently supports: 'track_changes', 'chart_understanding'.
   */
  extras?: string;
}

export interface ChunkOptions {
  chunk_size?: number; // default: 2048
  delimiter?: string;
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
