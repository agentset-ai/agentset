import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { uploadFileSchema, UploadResultSchema } from "@/schemas/api/upload";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const createUpload: ZodOpenApiOperationObject = {
  operationId: "createUpload",
  "x-speakeasy-name-override": "create",
  summary: "Create presigned URL for file upload",
  description:
    "Generate a presigned URL for uploading a single file to the specified namespace.",
  parameters: [namespaceIdPathSchema],
  requestBody: {
    required: true,
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
  ...makeCodeSamples(ts`
const result = await ns.uploads.upload({
  file: fs.createReadStream("./example.md"),
  contentType: "text/markdown",
});
console.log("Uploaded successfully: ", result.key);

// OR get the pre-signed URL manually
const file = fs.readFileSync("./example.md");
const result = await ns.uploads.create({
  fileName: "example.md",
  fileSize: file.length,
  contentType: "text/markdown",
});

await fetch(result.url, {
  method: "PUT",
  body: file,
  headers: {
    "Content-Type": "text/markdown",
  },
});
console.log("Uploaded successfully: ", result.key);
`),
};
