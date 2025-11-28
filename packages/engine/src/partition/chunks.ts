import { CrawlPartitionResultDocument } from "./crawl";
import { YoutubePartitionResultDocument } from "./youtube";

export type ChunksFile =
  | YoutubePartitionResultDocument
  | CrawlPartitionResultDocument
  | Omit<CrawlPartitionResultDocument, "page_metadata" | "url">;
