import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { batchUploadSchema, UploadResultSchema } from "@/schemas/api/upload";
import { z } from "zod/v4";

import { namespaceIdRequestParamSchema } from "../utils";

export const createBatchUpload: ZodOpenApiOperationObject = {
  operationId: "createBatchUpload",
  "x-speakeasy-name-override": "createBatch",
  summary: "Create presigned URLs for batch file upload",
  description:
    "Generate presigned URLs for uploading multiple files to the specified namespace.",
  requestParams: {
    path: namespaceIdRequestParamSchema,
  },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: batchUploadSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "Presigned URLs generated successfully",
      content: {
        "application/json": {
          schema: successSchema(z.array(UploadResultSchema)),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Uploads"],
  security: [{ token: [] }],
};
