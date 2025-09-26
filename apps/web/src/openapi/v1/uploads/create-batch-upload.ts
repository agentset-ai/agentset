import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { batchUploadSchema, UploadResultSchema } from "@/schemas/api/upload";
import { z } from "zod/v4";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const createBatchUpload: ZodOpenApiOperationObject = {
  operationId: "createBatchUpload",
  "x-speakeasy-name-override": "createBatch",
  summary: "Create presigned URLs for batch file upload",
  description:
    "Generate presigned URLs for uploading multiple files to the specified namespace.",
  parameters: [namespaceIdPathSchema],
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
  ...makeCodeSamples(ts`
const results = await ns.uploads.uploadBatch([
  {
    file: fs.createReadStream("./example-1.md"),
    contentType: "text/markdown",
  },
  {
    file: fs.createReadStream("./example-2.md"),
    contentType: "text/markdown",
  },
]);
console.log("Uploaded successfully: ", results.map((result) => result.key));

// OR get the pre-signed URLs manually
const file1 = fs.readFileSync("./example-1.md");
const file2 = fs.readFileSync("./example-2.md");

const results = await ns.uploads.createBatch({
  files: [
    {
      fileName: "example-1.md",
      fileSize: file1.length,
      contentType: "text/markdown",
    },
    {
      fileName: "example-2.md",
      fileSize: file2.length,
      contentType: "text/markdown",
    },
  ],
});

await Promise.all([file1, file2].map(async (file, i) => {
  await fetch(results[i]!.url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": "text/markdown",
    },
  });
}));

console.log("Upload URLs:", results.map((result) => result.key));
`),
};
