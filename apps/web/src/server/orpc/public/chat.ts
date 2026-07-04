import {
  checkSearchLimit,
  incrementOrganizationSearchUsage,
} from "@/lib/api/usage";
import { generateChat, streamChat } from "@/lib/chat";
import { namespaceIdPathSchema } from "@/openapi/v1/utils";
import { chatResponseSchema, chatSchema } from "@/schemas/api/chat";
import {
  publicApi,
  requireNamespace,
  successSchema,
} from "@/server/orpc/base";
import { toModelMessages } from "@/services/chat";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { z } from "zod/v4";

import type { QueryVectorStoreResult } from "@agentset/engine";

import { makeCodeSamples, ts } from "./code-samples";

/**
 * The JSON (non-stream) response body, documented in the spec override —
 * the output is a `type<>()` passthrough because the handler either returns
 * a raw `ReadableStream` (AI SDK SSE) or an unparsed JSON envelope, exactly
 * like the legacy route.
 */
const chatSuccessJsonSchema = () => {
  const [, jsonSchema] = new ZodToJsonSchemaConverter().convert(
    successSchema(chatResponseSchema),
    { strategy: "output" },
  );
  return jsonSchema;
};

const execute = publicApi
  .route({
    method: "POST",
    path: "/namespace/{namespaceId}/chat",
    operationId: "chat",
    summary: "Chat with a namespace",
    description:
      "Generate an answer to a conversation using the documents in a namespace (RAG). Supports `normal`, `agentic`, and `deepResearch` modes. When `stream` is `true`, the response is a `text/event-stream` of AI SDK UI message parts (including a `data-agentset-sources` part with the retrieved chunks) instead of the JSON envelope documented below.",
    tags: ["Chat"],
    outputStructure: "detailed",
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "execute",
      "x-speakeasy-group": "chat",
      security: [{ token: [] }],
      responses: {
        ...current.responses,
        "200": {
          description:
            "The generated answer and the sources used to generate it",
          content: {
            "application/json": {
              schema: chatSuccessJsonSchema() as never,
            },
          },
        },
      },
      ...makeCodeSamples(ts`
const result = await ns.chat({
  messages: [{ role: "user", content: "What is machine learning?" }],
  topK: 20,
  rerank: true,
});
console.log(result.message.content);
`),
    }),
  })
  .input(chatSchema.extend({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(
    // shaped for the OpenAPI generator's detailed-output check; `body` is an
    // always-pass custom schema so both the SSE ReadableStream and the JSON
    // envelope flow through untouched (real docs live in the spec override)
    z.object({
      status: z.literal(200).optional(),
      headers: z.record(z.string(), z.string()).optional(),
      body: z.custom<
        | ReadableStream
        | {
            success: true;
            data: {
              message: { role: "assistant"; content: string };
              sources?: QueryVectorStoreResult["results"];
            };
          }
      >(() => true),
    }),
  )
  .handler(async ({ context, input }) => {
    // TODO: set hard limits to prevent abuse
    checkSearchLimit(context.organization);

    const messages = toModelMessages(input.messages);

    const onUsageIncrement = (queries: number) => {
      incrementOrganizationSearchUsage(context.organization.id, queries);
    };

    if (input.stream) {
      const res = await streamChat({
        namespace: context.namespace,
        tenantId: context.tenantId,
        messages,
        options: input,
        headers: context.resHeaders,
        onUsageIncrement,
      });

      // the ReadableStream body passes through oRPC unserialized, preserving
      // the AI SDK SSE wire format byte-for-byte
      return {
        status: 200,
        headers: Object.fromEntries(res.headers.entries()),
        body: res.body!,
      };
    }

    const { text, sources } = await generateChat({
      namespace: context.namespace,
      tenantId: context.tenantId,
      messages,
      options: input,
      onUsageIncrement,
    });

    return {
      body: {
        success: true as const,
        data: {
          message: { role: "assistant" as const, content: text },
          sources,
        },
      },
    };
  });

export const chatRouter = {
  execute,
};
