import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_BUCKET: z.string().optional(),

    ASSETS_S3_ACCESS_KEY: z.string().optional(),
    ASSETS_S3_SECRET_KEY: z.string().optional(),
    ASSETS_S3_ENDPOINT: z.string().optional(),
    ASSETS_S3_BUCKET: z.string().optional(),
    ASSETS_S3_URL: z.string().optional(),

    IMAGES_S3_BUCKET: z.string().optional(),
  },
  runtimeEnv: {
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_BUCKET: process.env.S3_BUCKET,

    ASSETS_S3_ACCESS_KEY: process.env.ASSETS_S3_ACCESS_KEY,
    ASSETS_S3_SECRET_KEY: process.env.ASSETS_S3_SECRET_KEY,
    ASSETS_S3_ENDPOINT: process.env.ASSETS_S3_ENDPOINT,
    ASSETS_S3_BUCKET: process.env.ASSETS_S3_BUCKET,
    ASSETS_S3_URL: process.env.ASSETS_S3_URL,

    IMAGES_S3_BUCKET: process.env.IMAGES_S3_BUCKET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
