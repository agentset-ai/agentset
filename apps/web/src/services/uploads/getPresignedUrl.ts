/**
 * Get presigned URL for file upload
 *
 * Verifies namespace access and generates a presigned URL for uploading a file.
 */

import type { uploadFileSchema } from "@/schemas/api/upload";
import type { z } from "zod/v4";
import { AgentsetApiError } from "@/lib/api/errors";

import type { ProtectedAgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";
import { createUpload } from "../uploads";

export const getPresignedUrl = async (
  context: ProtectedAgentsetContext,
  input: {
    namespaceId: string;
    file: z.infer<typeof uploadFileSchema>;
  },
) => {
  await getNamespace(context, { id: input.namespaceId });

  const result = await createUpload({
    namespaceId: input.namespaceId,
    file: input.file,
  });

  if (!result.success) {
    throw new AgentsetApiError({
      code: "internal_server_error",
      message: result.error,
    });
  }

  return result.data;
};
