import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler/namespace";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import { uploadFileSchema, UploadResultSchema } from "@/schemas/api/upload";
import { createUpload } from "@/services/uploads";

export const POST = withNamespaceApiHandler(
  async ({ namespace, headers, req }) => {
    const { fileName, contentType, fileSize } =
      await uploadFileSchema.parseAsync(await parseRequestBody(req));

    const result = await createUpload({
      namespaceId: namespace.id,
      file: { fileName, contentType, fileSize },
    });

    if (!result.success) {
      throw new AgentsetApiError({
        code: "internal_server_error",
        message: result.error,
      });
    }

    return makeApiSuccessResponse({
      data: UploadResultSchema.parse(result.data),
      headers,
      status: 201,
    });
  },
  { logging: { routeName: "POST /v1/namespace/[namespaceId]/uploads" } },
);
