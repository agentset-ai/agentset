import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    S3_ACCESS_KEY: z.string(),
    S3_SECRET_KEY: z.string(),
    S3_ENDPOINT: z.url(),
    S3_BUCKET: z.string(),

    ASSETS_S3_BUCKET: z.string(),
    ASSETS_S3_URL: z.url(),

    IMAGES_S3_BUCKET: z.string(),
  },
  runtimeEnv: {
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_BUCKET: process.env.S3_BUCKET,

    ASSETS_S3_BUCKET: process.env.ASSETS_S3_BUCKET,
    ASSETS_S3_URL: process.env.ASSETS_S3_URL,

    IMAGES_S3_BUCKET: process.env.IMAGES_S3_BUCKET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
