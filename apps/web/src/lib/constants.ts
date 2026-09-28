import { env } from "@/env";

export const APP_NAME = env.NEXT_PUBLIC_APP_NAME;
export const SHORT_DOMAIN = env.NEXT_PUBLIC_APP_SHORT_DOMAIN;

const localHost = `localhost:${process.env.PORT ?? 3000}`;
const isProduction = env.NEXT_PUBLIC_VERCEL_ENV === "production";
const isPreview = env.NEXT_PUBLIC_VERCEL_ENV === "preview";
const protocol = isProduction || isPreview ? "https" : "http";

export const APP_HOSTNAME =
  env.NEXT_PUBLIC_APP_HOSTNAME ??
  (isProduction
    ? `app.${SHORT_DOMAIN}`
    : isPreview
      ? `staging.${SHORT_DOMAIN}`
      : localHost);

export const APP_HOSTNAMES = new Set([
  `app.${SHORT_DOMAIN}`,
  `staging.${SHORT_DOMAIN}`,
  localHost,
  APP_HOSTNAME,
]);

export const APP_DOMAIN = `${protocol}://${APP_HOSTNAME}`;

export const API_HOSTNAME =
  env.NEXT_PUBLIC_API_HOSTNAME ??
  (isProduction
    ? `api.${SHORT_DOMAIN}`
    : isPreview
      ? `api-staging.${SHORT_DOMAIN}`
      : `api.${localHost}`);

export const API_HOSTNAMES = new Set([
  `api.${SHORT_DOMAIN}`,
  `api-staging.${SHORT_DOMAIN}`,
  `api.${localHost}`,
  API_HOSTNAME,
]);

export const API_DOMAIN = `${protocol}://${API_HOSTNAME}`;

// CNAME target shown to customers for custom hosting domains
export const HOSTING_CNAME =
  env.NEXT_PUBLIC_HOSTING_CNAME ?? `cname.${SHORT_DOMAIN}`;

// for hosting
export const HOSTING_PREFIX = "/a/";
