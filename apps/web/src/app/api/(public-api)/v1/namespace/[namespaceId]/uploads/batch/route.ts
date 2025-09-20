import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler/namespace";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import { batchUploadSchema, UploadResultSchema } from "@/schemas/api/upload";
import { createBatchUpload } from "@/services/uploads";
import z from "zod/v4";

export const POST = withNamespaceApiHandler(
  async ({ namespace, headers, req }) => {
    const { files } = await batchUploadSchema.parseAsync(
      await parseRequestBody(req),
    );

    const result = await createBatchUpload({
      namespaceId: namespace.id,
      files,
    });

    if (!result.success) {
      throw new AgentsetApiError({
        code: "internal_server_error",
        message: result.error,
      });
    }

    return makeApiSuccessResponse({
      data: z.array(UploadResultSchema).parse(result.data),
      headers,
      status: 201,
    });
  },
  { logging: { routeName: "POST /v1/namespace/[namespaceId]/uploads/batch" } },
);
