import { ChunkOptions } from "./types";

export interface CrawlOptions {
  max_depth?: number;
  limit?: number;
  exclude_paths?: string[];
  include_paths?: string[];
  include_selectors?: string[];
  exclude_selectors?: string[];
  only_main_content?: boolean;
  headers?: Record<string, string>;
}

export interface CrawlPartitionBody {
  url: string;

  extra_metadata?: Record<string, unknown>;

  chunk_options?: ChunkOptions;
  crawl_options?: CrawlOptions;

  trigger_token_id: string;
  trigger_access_token: string;

  namespace_id: string;
}

export type CrawlPartitionDocument = {
  id: string;
  url: string;
  total_bytes: number;
  total_characters: number;
  total_chunks: number;
};

export type CrawlPartitionResult = {
  status: number; // 200 on success
  documents: CrawlPartitionDocument[];
};

export type CrawlPartitionResultDocument = {
  url: string;
  total_chunks: number;
  total_characters: number;
  metadata: Record<string, unknown>;
  page_metadata: {
    title?: string;
    description?: string;
    language?: string;
  };
  chunks: {
    id: string;
    text: string;
    metadata: {
      sequence_number: number;
    };
  }[];
};
