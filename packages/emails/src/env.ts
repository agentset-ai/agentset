import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    RESEND_API_KEY: z.string().min(1),
    APP_DOMAIN: z.url().optional(),
  },
  runtimeEnv: {
    APP_DOMAIN: process.env.APP_DOMAIN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  },
  emptyStringAsUndefined: true,
});
