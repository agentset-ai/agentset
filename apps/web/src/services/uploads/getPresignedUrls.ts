/**
 * Get presigned URLs for batch file upload
 *
 * Verifies namespace access and generates presigned URLs for uploading multiple files.
 */

import type { batchUploadSchema } from "@/schemas/api/upload";
import type { z } from "zod/v4";
import { AgentsetApiError } from "@/lib/api/errors";

import type { ProtectedAgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";
import { createBatchUpload } from "../uploads";

export const getPresignedUrls = async (
  context: ProtectedAgentsetContext,
  input: z.infer<typeof batchUploadSchema> & { namespaceId: string },
) => {
  await getNamespace(context, { id: input.namespaceId });

  const result = await createBatchUpload({
    namespaceId: input.namespaceId,
    files: input.files,
  });

  if (!result.success) {
    throw new AgentsetApiError({
      code: "internal_server_error",
      message: result.error,
    });
  }

  return result.data;
};
