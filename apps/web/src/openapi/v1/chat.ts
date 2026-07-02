import type {
  ZodOpenApiOperationObject,
  ZodOpenApiPathsObject,
} from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { chatResponseSchema, chatSchema } from "@/schemas/api/chat";

import { makeCodeSamples, ts } from "./code-samples";
import { namespaceIdPathSchema, tenantHeaderSchema } from "./utils";

export const chat: ZodOpenApiOperationObject = {
  operationId: "chat",
  "x-speakeasy-name-override": "execute",
  "x-speakeasy-group": "chat",
  summary: "Chat with a namespace",
  description:
    "Generate an answer to a conversation using the documents in a namespace (RAG). Supports `normal`, `agentic`, and `deepResearch` modes. When `stream` is `true`, the response is a `text/event-stream` of AI SDK UI message parts (including a `data-agentset-sources` part with the retrieved chunks) instead of the JSON envelope documented below.",
  parameters: [namespaceIdPathSchema, tenantHeaderSchema],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: chatSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The generated answer and the sources used to generate it",
      content: {
        "application/json": {
          schema: successSchema(chatResponseSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Chat"],
  security: [{ token: [] }],
  ...makeCodeSamples(ts`
const result = await ns.chat({
  messages: [{ role: "user", content: "What is machine learning?" }],
  topK: 20,
  rerank: true,
});
console.log(result.message.content);
`),
};

export const chatPaths: ZodOpenApiPathsObject = {
  "/v1/namespace/{namespaceId}/chat": {
    post: chat,
  },
};
