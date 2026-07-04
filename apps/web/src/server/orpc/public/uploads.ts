import { AgentsetApiError } from "@/lib/api/errors";
import { namespaceIdPathSchema } from "@/schemas/api/params";
import {
  batchUploadSchema,
  uploadFileSchema,
  UploadResultSchema,
} from "@/schemas/api/upload";
import { publicApi, requireNamespace, successSchema } from "@/server/orpc/base";
import { createBatchUpload, createUpload } from "@/services/uploads";
import { z } from "zod/v4";

import { makeCodeSamples, ts } from "./code-samples";

const create = publicApi
  .route({
    method: "POST",
    path: "/namespace/{namespaceId}/uploads",
    successStatus: 201,
    operationId: "createUpload",
    summary: "Create presigned URL for file upload",
    description:
      "Generate a presigned URL for uploading a single file to the specified namespace.",
    tags: ["Uploads"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "create",
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
    }),
  })
  .input(uploadFileSchema.extend({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(UploadResultSchema))
  .handler(async ({ context, input }) => {
    const result = await createUpload({
      namespaceId: context.namespace.id,
      file: {
        fileName: input.fileName,
        contentType: input.contentType,
        fileSize: input.fileSize,
      },
    });

    if (!result.success) {
      throw new AgentsetApiError({
        code: "internal_server_error",
        message: result.error,
      });
    }

    return { success: true as const, data: result.data };
  });

const createBatch = publicApi
  .route({
    method: "POST",
    path: "/namespace/{namespaceId}/uploads/batch",
    successStatus: 201,
    operationId: "createBatchUpload",
    summary: "Create presigned URLs for batch file upload",
    description:
      "Generate presigned URLs for uploading multiple files to the specified namespace.",
    tags: ["Uploads"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "createBatch",
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
    }),
  })
  .input(batchUploadSchema.extend({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(z.array(UploadResultSchema)))
  .handler(async ({ context, input }) => {
    const result = await createBatchUpload({
      namespaceId: context.namespace.id,
      files: input.files,
    });

    if (!result.success) {
      throw new AgentsetApiError({
        code: "internal_server_error",
        message: result.error,
      });
    }

    return { success: true as const, data: result.data };
  });

export const uploadsRouter = {
  create,
  createBatch,
};
