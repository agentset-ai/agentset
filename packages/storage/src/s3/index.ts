import type { GetObjectCommandInput } from "@aws-sdk/client-s3";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { MAX_UPLOAD_SIZE } from "../constants";
import { env } from "../env";

const s3Client = new S3Client({
  region: "auto",
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
});

const DOWNLOAD_EXPIRATION = 60 * 60 * 24; // 24 hours
const UPLOAD_EXPIRATION = 60 * 60 * 1; // 1 hour

const presignUploadOptions = {
  expiresIn: UPLOAD_EXPIRATION,
  signableHeaders: new Set(["content-type"]),
} satisfies NonNullable<Parameters<typeof getSignedUrl>[2]>;

export const presignUploadUrl = async ({
  key,
  contentType,
  fileSize,
}: {
  key: string;
  contentType: string;
  fileSize: number;
}) => {
  if (fileSize > MAX_UPLOAD_SIZE) {
    throw new Error("File size is too large");
  }

  return await presignPutUrl({
    key,
    contentType,
    fileSize,
    expiresIn: presignUploadOptions.expiresIn,
    signableHeaders: presignUploadOptions.signableHeaders,
  });
};

export async function presignGetUrl(
  key: string,
  {
    expiresIn = DOWNLOAD_EXPIRATION,
    fileName,
  }: {
    expiresIn?: number;
    fileName?: string;
  } = {},
) {
  const command: GetObjectCommandInput = {
    Bucket: env.S3_BUCKET,
    Key: key,
  };
  if (fileName)
    command.ResponseContentDisposition = `attachment; filename="${fileName}"`;

  const url = await getSignedUrl(s3Client, new GetObjectCommand(command), {
    expiresIn,
  });

  return { url, key };
}

export const presignPutUrl = async ({
  key,
  contentType,
  fileSize,
  expiresIn,
  signableHeaders,
}: {
  key: string;
  contentType?: string;
  fileSize?: number;
  expiresIn?: number;
  signableHeaders?: Set<string>;
}) => {
  const result = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: fileSize,
    }),
    {
      expiresIn,
      signableHeaders,
    },
  );

  return result;
};

export async function getFileMetadata(key: string) {
  const data = await s3Client.send(
    new HeadObjectCommand({
      Key: key,
      Bucket: env.S3_BUCKET,
    }),
  );

  return {
    metadata: data.Metadata,
    size: data.ContentLength,
    mimeType: data.ContentType,
    lastModified: data.LastModified,
  };
}

export async function checkFileExists(key: string) {
  try {
    await getFileMetadata(key);
  } catch (e: any) {
    if (e?.code === "NotFound" || e?.$metadata.httpStatusCode === 404) {
      return false; // File does not exist
    } else {
      throw e; // Other errors (e.g., permission issues)
    }
  }

  return true;
}

export function deleteObject(key: string) {
  return s3Client.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
  );
}

export function deleteManyObjects(keys: string[]) {
  return s3Client.send(
    new DeleteObjectsCommand({
      Bucket: env.S3_BUCKET,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
      },
    }),
  );
}
