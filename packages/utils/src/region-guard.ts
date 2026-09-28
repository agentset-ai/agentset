import { isEuRegion } from "./region";

type EnvSource = Record<string, string | undefined>;

/**
 * sha256 (hex) of hosts and resource names that belong to the US deployment
 * and must never be configured on EU. Hashes avoid listing the names in plain
 * text.
 */
export const US_ONLY_HOST_SHA256: readonly string[] = [
  // Azure resource name (compare DEFAULT_AZURE_RESOURCE_NAME)
  "19822947b716e640efb13d89fcf2556b332555c3b0d510d6266ccbe64448b19b",
  // Redis REST host (compare the REDIS_URL hostname)
  "56afe9305397d3c4f91710cdf8d3873902a7b12d935e6369b189bb580f3c376d",
  // Partition API host (compare the PARTITION_API_URL hostname)
  "414482567dbf2c2a15705dda4fae3676483ef264cee71ffc2909f81b5abcc670",
];

const sha256Hex = (value: string) => {
  // Loaded at call time rather than imported: env modules that use these
  // checks are also bundled for the browser, where the checks never run.
  const crypto =
    typeof process.getBuiltinModule === "function"
      ? process.getBuiltinModule("node:crypto")
      : undefined;
  if (!crypto) {
    throw new Error("Region guards require the Node.js runtime");
  }

  return crypto.createHash("sha256").update(value).digest("hex");
};

export const isUsOnlyHost = (value: string) =>
  US_ONLY_HOST_SHA256.includes(sha256Hex(value.trim().toLowerCase()));

const isSet = (env: EnvSource, name: string) => !!env[name];

const parseUrl = (value: string) =>
  URL.canParse(value) ? new URL(value) : undefined;

/** An https Azure AI Foundry endpoint (`*.services.ai.azure.com`). */
export const isAzureFoundryEndpoint = (value: string | undefined) => {
  const url = value ? parseUrl(value) : undefined;
  return (
    url?.protocol === "https:" &&
    url.hostname.endsWith(".services.ai.azure.com")
  );
};

export const getEuUnsetIssues = (env: EnvSource, names: readonly string[]) =>
  names
    .filter((name) => isSet(env, name))
    .map((name) => `${name} must not be set in the EU region`);

export const getEuRequiredIssues = (env: EnvSource, names: readonly string[]) =>
  names
    .filter((name) => !isSet(env, name))
    .map((name) => `${name} is required in the EU region`);

const getUrlIssues = (
  env: EnvSource,
  name: string,
  isAllowed: (url: URL) => boolean,
  requirement: string,
): string[] => {
  const value = env[name];
  if (!value) return [`${name} is required in the EU region`];

  const url = parseUrl(value);
  if (!url) return [`${name} must be a valid URL`];

  return isAllowed(url) ? [] : [`${name} ${requirement}`];
};

const getUsOnlyHostIssues = (env: EnvSource, name: string): string[] => {
  const value = env[name];
  if (!value) return [];

  const url = parseUrl(value);
  return url && isUsOnlyHost(url.hostname)
    ? [`${name} points to a US-only host`]
    : [];
};

/** Managed (shared-account) credentials: EU namespaces bring their own. */
export const EU_UNSET_ENGINE_ENV = [
  "DEFAULT_PINECONE_API_KEY",
  "DEFAULT_PINECONE_HOST",
  "SECONDARY_PINECONE_API_KEY",
  "SECONDARY_PINECONE_HOST",
  "DEFAULT_TURBOPUFFER_API_KEY",
  "DEFAULT_ZEROENTROPY_API_KEY",
] as const;

/** Read implicitly by provider SDKs when no explicit option is passed. */
export const EU_UNSET_SDK_ENV = [
  "TURBOPUFFER_BASE_URL",
  "TURBOPUFFER_REGION",
  "ZEROENTROPY_BASE_URL",
  "CO_API_KEY",
  "AZURE_RESOURCE_NAME",
  "AZURE_API_KEY",
] as const;

export const EU_UNSET_TINYBIRD_ENV = [
  "TINYBIRD_API_KEY",
  "TINYBIRD_API_URL",
] as const;

export const EU_UNSET_WEB_ENV = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXT_PUBLIC_POSTHOG_KEY",
  ...EU_UNSET_TINYBIRD_ENV,
] as const;

export const EU_REQUIRED_WEB_ENV = [
  "NEXT_PUBLIC_APP_HOSTNAME",
  "NEXT_PUBLIC_API_HOSTNAME",
  "NEXT_PUBLIC_HOSTING_CNAME",
  "APP_DOMAIN",
] as const;

const EU_DATABASE_HOST_PATTERN = /(^|[.-])eu-(central|west|north|south)-\d/;

export const getEuEngineConfigIssues = (env: EnvSource): string[] => {
  const issues = [
    ...getUrlIssues(
      env,
      "DEFAULT_COHERE_BASE_URL",
      (url) => isAzureFoundryEndpoint(url.href),
      "must be an https://*.services.ai.azure.com endpoint",
    ),
    ...getEuUnsetIssues(env, EU_UNSET_ENGINE_ENV),
    ...getEuUnsetIssues(env, EU_UNSET_SDK_ENV),
    ...getUsOnlyHostIssues(env, "PARTITION_API_URL"),
  ];

  const azureResourceName = env.DEFAULT_AZURE_RESOURCE_NAME;
  if (azureResourceName && isUsOnlyHost(azureResourceName)) {
    issues.push("DEFAULT_AZURE_RESOURCE_NAME points to a US-only resource");
  }

  return issues;
};

export const getEuStorageConfigIssues = (env: EnvSource) =>
  getUrlIssues(
    env,
    "S3_ENDPOINT",
    (url) => url.hostname.endsWith(".eu.r2.cloudflarestorage.com"),
    "must be an EU jurisdiction R2 endpoint (*.eu.r2.cloudflarestorage.com)",
  );

// URL TLS parameters replace the TLS options set in code (see @agentset/db)
const DATABASE_URL_TLS_PARAMS = [
  "ssl",
  "sslmode",
  "sslrootcert",
  "sslcert",
  "sslkey",
] as const;

export const getEuDatabaseConfigIssues = (env: EnvSource) => {
  const issues = getUrlIssues(
    env,
    "DATABASE_URL",
    (url) => EU_DATABASE_HOST_PATTERN.test(url.hostname),
    "must point to an EU database host",
  );

  const url = env.DATABASE_URL ? parseUrl(env.DATABASE_URL) : undefined;
  const tlsParam = DATABASE_URL_TLS_PARAMS.find((param) =>
    url?.searchParams.has(param),
  );
  if (tlsParam) {
    issues.push(
      `DATABASE_URL must not set ${tlsParam} in the EU region (TLS is configured in code)`,
    );
  }

  return issues;
};

export const getEuRedisConfigIssues = (env: EnvSource) =>
  getUsOnlyHostIssues(env, "REDIS_URL");

export const getEuWebConfigIssues = (env: EnvSource): string[] => {
  const issues = [
    ...getEuRequiredIssues(env, EU_REQUIRED_WEB_ENV),
    ...getEuUnsetIssues(env, EU_UNSET_WEB_ENV),
    ...getEuDatabaseConfigIssues(env),
    ...getEuRedisConfigIssues(env),
  ];

  // APP_DOMAIN/API_DOMAIN fall back to http:// without it
  if (env.VERCEL === "1" && !isSet(env, "NEXT_PUBLIC_VERCEL_ENV")) {
    issues.push(
      "NEXT_PUBLIC_VERCEL_ENV is required in the EU region on Vercel",
    );
  }

  const appHostname = env.NEXT_PUBLIC_APP_HOSTNAME;
  if (appHostname) {
    for (const name of ["BETTER_AUTH_URL", "APP_DOMAIN"]) {
      const value = env[name];
      const url = value ? parseUrl(value) : undefined;
      if (url && url.host !== appHostname) {
        issues.push(`${name} must use the NEXT_PUBLIC_APP_HOSTNAME host`);
      }
    }
  }

  return issues;
};

/**
 * Throws when the EU deployment is misconfigured. Messages name variables,
 * never their values. No-op on US and in the browser.
 */
export const enforceEuConfig = (getIssues: () => readonly string[]) => {
  const isBrowser =
    typeof (globalThis as { window?: unknown }).window !== "undefined";
  if (!isEuRegion || isBrowser) return;

  const issues = getIssues();
  if (issues.length === 0) return;

  throw new Error(
    `Invalid EU region configuration:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`,
  );
};
