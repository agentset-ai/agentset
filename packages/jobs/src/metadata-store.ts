import { Redis } from "@upstash/redis";

// EU task payloads carry only an opaque ID. The worker reads the patch from
// region-local Redis; retain it across retries and queued runs for three days.
const METADATA_UPDATE_TTL_SECONDS = 60 * 60 * 24 * 3;

let redis: Redis | undefined;
const getRedis = () =>
  (redis ??= new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN,
  }));

const getMetadataUpdateKey = (requestId: string) =>
  `metadata-update:${requestId}`;

export const storeMetadataUpdatePatch = async (
  requestId: string,
  metadata: unknown,
) => {
  await getRedis().set(getMetadataUpdateKey(requestId), metadata, {
    ex: METADATA_UPDATE_TTL_SECONDS,
  });
};

export const getMetadataUpdatePatch = (requestId: string) =>
  getRedis().get<unknown>(getMetadataUpdateKey(requestId));
