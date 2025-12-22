import { AgenticTools } from "@/lib/agentic/tools";
import { UseChatHelpers } from "@ai-sdk/react";
import { UIMessage } from "ai";

import { QueryVectorStoreResult } from "@agentset/engine";

// Create a new custom message type with your own metadata
export type MyUIMessage = UIMessage<
  {},
  {
    "agentset-sources": QueryVectorStoreResult;
  },
  AgenticTools
>;
export type MyUseChat = UseChatHelpers<MyUIMessage>;
