import { env } from "@/env";

export const APP_NAME = env.NEXT_PUBLIC_APP_NAME;
export const SHORT_DOMAIN = env.NEXT_PUBLIC_APP_SHORT_DOMAIN;

const localHost = `localhost:${process.env.PORT ?? 3000}`;
export const APP_HOSTNAMES = new Set([
  `app.${SHORT_DOMAIN}`,
  `staging.${SHORT_DOMAIN}`,
  localHost,
]);

export const APP_DOMAIN =
  env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? `https://app.${SHORT_DOMAIN}`
    : env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? `https://staging.${SHORT_DOMAIN}`
      : `http://${localHost}`;

export const API_HOSTNAMES = new Set([
  `api.${SHORT_DOMAIN}`,
  `api-staging.${SHORT_DOMAIN}`,
  `api.${localHost}`,
]);

export const API_DOMAIN =
  env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? `https://api.${SHORT_DOMAIN}`
    : env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? `https://api-staging.${SHORT_DOMAIN}`
      : `http://api.${localHost}`;

// for hosting
export const HOSTING_PREFIX = "/a/";
