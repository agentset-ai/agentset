import { CrawlPartitionResultDocument } from "./crawl";
import { YoutubePartitionResultDocument } from "./youtube";

export type ChunksFile =
  | YoutubePartitionResultDocument
  | CrawlPartitionResultDocument;
