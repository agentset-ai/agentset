import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { uploadFileSchema, UploadResultSchema } from "@/schemas/api/upload";

import { namespaceIdRequestParamSchema } from "../utils";

export const createUpload: ZodOpenApiOperationObject = {
  operationId: "createUpload",
  "x-speakeasy-name-override": "create",
  summary: "Create presigned URL for file upload",
  description:
    "Generate a presigned URL for uploading a single file to the specified namespace.",
  requestParams: {
    path: namespaceIdRequestParamSchema,
  },
  requestBody: {
    content: {
      "application/json": {
        schema: uploadFileSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "Presigned URL generated successfully",
      content: {
        "application/json": {
          schema: successSchema(UploadResultSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Uploads"],
  security: [{ token: [] }],
};
