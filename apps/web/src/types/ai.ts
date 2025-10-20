import { UseChatHelpers } from "@ai-sdk/react";
import { UIMessage } from "ai";

import { QueryVectorStoreResult } from "@agentset/engine";

type MyMetadata = {};

type MyUIMessageParts = {
  "agentset-sources":
    | QueryVectorStoreResult
    | (Pick<QueryVectorStoreResult, "results"> & {
        logs?: QueryVectorStoreResult[];
      });
  status:
    | {
        value: "generating-queries" | "generating-answer";
      }
    | {
        value: "searching";
        queries: string[];
      };
};

// Create a new custom message type with your own metadata
export type MyUIMessage = UIMessage<MyMetadata, MyUIMessageParts>;
export type MyUseChat = UseChatHelpers<MyUIMessage>;
