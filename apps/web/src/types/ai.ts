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

  queries: string[];
  status: "generating-queries" | "searching" | "generating-answer";
};

// Create a new custom message type with your own metadata
export type MyUIMessage = UIMessage<MyMetadata, MyUIMessageParts>;
export type MyUseChat = UseChatHelpers<MyUIMessage>;
