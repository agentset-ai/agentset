import type { AgenticTools } from "@/lib/agentic-search/tools";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { InferUITools, UIDataTypes, UIMessage } from "ai";

type MyMetadata = unknown;

// Create a new custom message type with your own metadata
export type MyUIMessage = UIMessage<
  MyMetadata,
  UIDataTypes,
  InferUITools<AgenticTools>
>;
export type MyUseChat = UseChatHelpers<MyUIMessage>;
