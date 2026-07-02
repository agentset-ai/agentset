import type { AgenticTools } from "@/lib/agentic-search/tools";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { InferUITools, UIMessage } from "ai";

type MyMetadata = unknown;

type MyUIMessageParts = {
  // the model's <planning> block, extracted into a first-class part
  planning: string;
};

// Create a new custom message type with your own metadata
export type MyUIMessage = UIMessage<
  MyMetadata,
  MyUIMessageParts,
  InferUITools<AgenticTools>
>;
export type MyUseChat = UseChatHelpers<MyUIMessage>;
