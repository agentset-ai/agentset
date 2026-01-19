import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    RESEND_API_KEY: z.string().min(1),
    APP_DOMAIN: z.string().url().optional(),
  },
  experimental__runtimeEnv: {},
});
