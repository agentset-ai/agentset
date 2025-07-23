import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { fetchWithTimeout } from "@agentset/utils";

import { env } from "../env";

interface ImageOptions {
  contentType?: string;
  width?: number;
  height?: number;
}

const s3Client = new S3Client({
  region: "auto",
  endpoint: env.ASSETS_S3_ENDPOINT,
  credentials: {
    accessKeyId: env.ASSETS_S3_ACCESS_KEY,
    secretAccessKey: env.ASSETS_S3_SECRET_KEY,
  },
});

export function deleteAsset(key: string) {
  return s3Client.send(
    new DeleteObjectCommand({
      Bucket: env.ASSETS_S3_BUCKET,
      Key: key,
    }),
  );
}

const isBase64 = (str: string) => {
  const base64Regex =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

  const dataImageRegex =
    /^data:image\/[a-zA-Z0-9.+-]+;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

  return base64Regex.test(str) || dataImageRegex.test(str);
};

const isUrl = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch (_) {
    return false;
  }
};

const base64ToArrayBuffer = (base64: string, opts?: ImageOptions) => {
  const base64Data = base64.replace(/^data:.+;base64,/, "");
  const paddedBase64Data = base64Data.padEnd(
    base64Data.length + ((4 - (base64Data.length % 4)) % 4),
    "=",
  );

  const binaryString = atob(paddedBase64Data);
  const byteArray = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    byteArray[i] = binaryString.charCodeAt(i);
  }
  const blobProps: Record<string, string> = {};
  if (opts?.contentType) blobProps["type"] = opts.contentType;
  return new Blob([byteArray], blobProps);
};

const urlToBlob = async (url: string, opts?: ImageOptions): Promise<Blob> => {
  let response: Response;
  if (opts?.height || opts?.width) {
    try {
      const proxyUrl = new URL("https://wsrv.nl");
      proxyUrl.searchParams.set("url", url);
      if (opts.width) proxyUrl.searchParams.set("w", opts.width.toString());
      if (opts.height) proxyUrl.searchParams.set("h", opts.height.toString());
      proxyUrl.searchParams.set("fit", "cover");
      response = await fetchWithTimeout(proxyUrl.toString());
    } catch (error) {
      response = await fetch(url);
    }
  } else {
    response = await fetch(url);
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }
  const blob = await response.blob();
  if (opts?.contentType) {
    return new Blob([blob], { type: opts.contentType });
  }
  return blob;
};

export async function uploadImage(
  key: string,
  body: Blob | string,
  opts?: ImageOptions,
) {
  let uploadBody: Blob;
  if (typeof body === "string") {
    if (isBase64(body)) {
      uploadBody = base64ToArrayBuffer(body, opts);
    } else if (isUrl(body)) {
      uploadBody = await urlToBlob(body, opts);
    } else {
      throw new Error("Invalid input: Not a base64 string or a valid URL");
    }
  } else {
    uploadBody = body;
  }

  const buffer = await uploadBody.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.ASSETS_S3_BUCKET,
        Key: key,
        Body: uint8Array,
        ContentLength: uploadBody.size,
        ContentType: opts?.contentType,
      }),
    );

    return {
      url: `${env.ASSETS_S3_URL}/${key}`,
    };
  } catch (error: any) {
    console.error("Image upload failed", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

export default s3Client;
