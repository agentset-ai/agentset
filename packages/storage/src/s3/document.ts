import { env } from "../env";
import {
  checkFileExists,
  deleteObject,
  deleteObjectsByPrefix,
  getObject,
  presignGetUrl,
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

export async function getChunksJsonFromS3<T>(
  namespaceId: string,
  documentId: string,
): Promise<T | null> {
  const key = makeChunksKey(namespaceId, documentId);
  const exists = await checkFileExists(key);
  if (!exists) return null;

  const file = await (await getObject(key)).Body?.transformToString();
  if (!file) return null;

  try {
    return JSON.parse(file) as T;
  } catch (error) {
    return null;
  }
}
