import { env } from "../env";
import {
  checkFileExists,
  deleteObject,
  deleteObjectsByPrefix,
  presignGetUrl,
  presignPutUrl,
} from "./base";

export function deleteDocumentImages(namespaceId: string, documentId: string) {
  const prefix = `namespaces/${namespaceId}/documents/${documentId}/`;
  return deleteObjectsByPrefix(prefix, {
    bucket: env.IMAGES_S3_BUCKET,
  });
}

const makeChunksKey = (namespaceId: string, documentId: string) =>
  `namespaces/${namespaceId}/documents/${documentId}/chunks.json`;

export async function deleteDocumentChunksFile(
  namespaceId: string,
  documentId: string,
) {
  const chunksKey = makeChunksKey(namespaceId, documentId);

  const chunksFileExists = await checkFileExists(chunksKey);
  if (chunksFileExists) {
    await deleteObject(chunksKey);
    return true;
  }

  return false;
}

export async function presignChunksUploadUrl(
  namespaceId: string,
  documentId: string,
) {
  return presignPutUrl({
    key: makeChunksKey(namespaceId, documentId),
    contentType: "application/json",
  });
}

export async function presignChunksDownloadUrl(
  namespaceId: string,
  documentId: string,
) {
  const key = makeChunksKey(namespaceId, documentId);
  const exists = await checkFileExists(key);
  if (!exists) return null;

  const { url } = await presignGetUrl(key, {
    fileName: `${documentId}-chunks.json`,
  });

  return url;
}
