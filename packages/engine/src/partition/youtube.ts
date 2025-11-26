import { ChunkOptions } from "./types";

export interface YoutubePartitionBody {
  urls: string[];
  transcript_languages?: string[];

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
  metadata: Record<string, unknown>;
  video_metadata: {
    video_id: string;
    url: string;
    title: string;
    description: string;
    tags?: string[];
    category?: string;
    timestamp?: number; // in seconds
    channel_id?: string;
    channel_name?: string;
    views?: number;
    comments?: number;
    duration?: number; // in seconds
  };
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
