export const SUPPORTED_TYPES: {
  title: string;
  extensions: string[];
  mimeTypes?: string[];
  mimeTypesPrefixes?: string[];
}[] = [
  {
    title: "pdf",
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
  },
  {
    title: "spreadsheet",
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.oasis.opendocument.spreadsheet",
    ],
    mimeTypesPrefixes: ["text/csv", "application/csv"],
    extensions: [".xls", ".xlsx", ".ods", ".csv"],
  },
  {
    title: "word",
    mimeTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.oasis.opendocument.text",
    ],
    extensions: [".doc", ".docx", ".odt"],
  },
  {
    title: "presentation",
    mimeTypes: [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.oasis.opendocument.presentation",
    ],
    extensions: [".ppt", ".pptx", ".odp"],
  },
  {
    title: "html",
    mimeTypes: ["text/html", "application/xhtml+xml"],
    extensions: [".html", ".htm"],
  },
  {
    title: "epub",
    mimeTypes: [
      "application/epub",
      "application/epub+zip",
      "application/x-epub+zip",
    ],
    extensions: [".epub"],
  },
  {
    title: "image",
    mimeTypes: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/tiff",
      "image/jpg",
    ],
    extensions: [".png", ".jpeg", ".webp", ".gif", ".tiff", ".jpg"],
  },
  {
    title: "message",
    mimeTypes: ["application/vnd.ms-outlook"],
    extensions: [".msg"],
  },
  {
    title: "text",
    mimeTypesPrefixes: ["text/", "application/json", "application/markdown"],
    extensions: [
      ".txt",
      ".text",
      ".md",
      ".markdown",
      ".json",
      ".jsonl",
      ".xml",
    ],
  },
  {
    title: "rss",
    mimeTypes: [
      "application/rss",
      "application/rss+xml",
      "application/atom",
      "application/atom+xml",
    ],
    extensions: [".rss", ".atom"],
  },
];

export const SUPPORTED_MIME_TYPES = SUPPORTED_TYPES.flatMap(
  (type) => type.mimeTypes ?? [],
);
export const SUPPORTED_MIME_TYPES_PREFIXES = SUPPORTED_TYPES.flatMap(
  (type) => type.mimeTypesPrefixes ?? [],
);
export const SUPPORTED_EXTENSIONS = SUPPORTED_TYPES.flatMap(
  (type) => type.extensions,
);
