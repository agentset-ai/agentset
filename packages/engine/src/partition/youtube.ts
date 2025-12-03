import { ChunkOptions } from "./types";

export interface YoutubePartitionBody {
  urls: string[];

  transcript_languages?: string[];
  include_metadata?: boolean;

  extra_metadata?: Record<string, unknown>;

  chunk_options?: ChunkOptions;

  trigger_token_id: string;
  trigger_access_token: string;

  namespace_id: string;
}

export type YoutubePartitionDocument = {
  id: string;
  video_id: string;
  title: string;
  total_bytes: number;
  total_characters: number;
  total_chunks: number;
};

export type YoutubePartitionResult = {
  status: number; // 200 on success
  documents: YoutubePartitionDocument[];
};

export type YoutubePartitionResultDocument = {
  id: string;
  metadata: {
    youtube_id: string;
    youtube_title: string;
    youtube_description: string;
    youtube_duration?: number; // in seconds
    youtube_timestamp?: number; // in seconds
  } & Record<string, unknown>;
  total_chunks: number;
  total_characters: number;
  chunks: {
    id: string;
    text: string;
    metadata: {
      sequence_number: number;
    };
  }[];
};
