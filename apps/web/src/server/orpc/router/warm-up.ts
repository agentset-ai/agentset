import { AgentsetApiError } from "@/lib/api/errors";
import { namespaceIdPathSchema } from "@/schemas/api/params";
import { api, requireNamespace } from "@/server/orpc/base";
import { type } from "@orpc/server";
import { z } from "zod/v4";

import { getNamespaceVectorStore } from "@agentset/engine";

import { makeCodeSamples, ts } from "./code-samples";

const warmUp = api
  .route({
    method: "POST",
    path: "/namespace/{namespaceId}/warm-up",
    operationId: "warmUp",
    summary: "Warm cache for a namespace",
    description:
      "Pre-loads the namespace into the vector store's cache for faster query performance. Not all vector stores support this operation. Currently only Turbopuffer supports this operation.",
    tags: ["Namespaces"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "warmUp",
      "x-speakeasy-group": "namespace",
      security: [{ token: [] }],
      // the handler doesn't parse its output (typed passthrough), so the
      // response documentation is carried here (copied from openapi/v1/warm-up.ts)
      responses: {
        ...current.responses,
        "200": {
          description: "Cache warming started",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    const: true,
                  },
                  data: {
                    type: "object",
                    properties: {
                      status: {
                        type: "boolean",
                      },
                    },
                    required: ["status"],
                    additionalProperties: false,
                  },
                },
                required: ["success", "data"],
                additionalProperties: false,
              },
            },
          },
        },
      },
      ...makeCodeSamples(ts`
await ns.warmUp();
console.log("Cache warmed successfully");
`),
    }),
  })
  .input(z.object({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(type<{ success: true; data: { status: boolean } }>())
  .handler(async ({ context }) => {
    const vectorStore = await getNamespaceVectorStore(
      context.namespace,
      context.tenantId,
    );
    const result = await vectorStore.warmCache();

    if (result === "UNSUPPORTED") {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Warm cache is not supported for this vector store",
      });
    }

    return { success: true as const, data: { status: true } };
  });

export const warmUpRouter = {
  warmUp,
};
