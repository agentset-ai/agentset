import type { GetObjectCommandInput } from "@aws-sdk/client-s3";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { filterFalsy } from "@agentset/utils";

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

export function uploadObject(
  key: string,
  body: string | Uint8Array | Buffer | ReadableStream,
  {
    contentType,
    fileSize,
    bucket = env.S3_BUCKET,
  }: {
    contentType?: string;
    fileSize?: number;
    bucket?: string;
  } = {},
) {
  return s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentLength: fileSize,
      ContentType: contentType,
    }),
  );
}

export async function presignGetUrl(
  key: string,
  {
    expiresIn = DOWNLOAD_EXPIRATION,
    fileName,
    bucket = env.S3_BUCKET,
  }: {
    expiresIn?: number;
    fileName?: string;
    bucket?: string;
  } = {},
) {
  const command: GetObjectCommandInput = {
    Bucket: bucket,
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
  bucket = env.S3_BUCKET,
}: {
  key: string;
  contentType?: string;
  fileSize?: number;
  expiresIn?: number;
  signableHeaders?: Set<string>;
  bucket?: string;
}) => {
  const result = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: bucket,
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

export async function getFileMetadata(
  key: string,
  {
    bucket = env.S3_BUCKET,
  }: {
    bucket?: string;
  } = {},
) {
  const data = await s3Client.send(
    new HeadObjectCommand({
      Key: key,
      Bucket: bucket,
    }),
  );

  return {
    metadata: data.Metadata,
    size: data.ContentLength,
    mimeType: data.ContentType,
    lastModified: data.LastModified,
  };
}

export async function checkFileExists(
  key: string,
  options: {
    bucket?: string;
  } = {},
) {
  try {
    await getFileMetadata(key, options);
  } catch (e: any) {
    if (e?.code === "NotFound" || e?.$metadata.httpStatusCode === 404) {
      return false; // File does not exist
    } else {
      throw e; // Other errors (e.g., permission issues)
    }
  }

  return true;
}

export function deleteObject(
  key: string,
  {
    bucket = env.S3_BUCKET,
  }: {
    bucket?: string;
  } = {},
) {
  return s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export function deleteManyObjects(
  keys: string[],
  {
    bucket = env.S3_BUCKET,
  }: {
    bucket?: string;
  } = {},
) {
  return s3Client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
      },
    }),
  );
}

export async function* listByPrefix(
  prefix: string,
  {
    bucket = env.S3_BUCKET,
    maxKeys = 1000,
  }: {
    bucket?: string;
    maxKeys?: number;
  } = {},
) {
  let continuationToken: string | undefined;

  do {
    const listedObjects = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: maxKeys,
      }),
    );

    const keys = listedObjects.Contents
      ? filterFalsy(listedObjects.Contents.map((object) => object.Key))
      : [];

    yield keys;

    continuationToken = listedObjects.IsTruncated
      ? listedObjects.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

export async function deleteObjectsByPrefix(
  prefix: string,
  {
    bucket = env.S3_BUCKET,
  }: {
    bucket?: string;
  } = {},
) {
  for await (const keys of listByPrefix(prefix, { bucket })) {
    if (keys.length > 0) {
      await deleteManyObjects(keys, { bucket });
    }
  }
}

export async function getObject(
  key: string,
  {
    bucket = env.S3_BUCKET,
  }: {
    bucket?: string;
  } = {},
) {
  return s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}
