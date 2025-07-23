import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    STRIPE_API_KEY: z.string(),
    NODE_ENV: z
      .enum(["development", "production", "preview"])
      .default("development"),
  },
  client: {
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: z.string(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    STRIPE_API_KEY: process.env.STRIPE_API_KEY,
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
  },
});
