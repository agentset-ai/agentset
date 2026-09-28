export type DeploymentRegion = "us" | "eu";

const parseDeploymentRegion = (value: string | undefined): DeploymentRegion => {
  if (!value || value === "us") return "us";
  if (value === "eu") return "eu";

  throw new Error('NEXT_PUBLIC_DEPLOYMENT_REGION must be "us" or "eu"');
};

// Read as a literal property access so Next.js inlines it in client bundles.
export const DEPLOYMENT_REGION: DeploymentRegion = parseDeploymentRegion(
  process.env.NEXT_PUBLIC_DEPLOYMENT_REGION,
);

export const isEuRegion = DEPLOYMENT_REGION === "eu";

const isUsRegion = !isEuRegion;

export const REGION_FEATURES = Object.freeze({
  googleSignIn: isUsRegion,
  productAnalytics: isUsRegion,
  webhookDeliveryLogs: isUsRegion,
  managedVectorStores: isUsRegion,
  zeroEntropyRerank: isUsRegion,
  youtubeIngestion: isUsRegion,
  demoTemplates: isUsRegion,
  usHostedEmbeddingProviders: isUsRegion,
  customerAzureEmbeddings: isUsRegion,
  thirdPartyBrowserAssets: isUsRegion,
  calEmbed: isUsRegion,
});

export type RegionFeature = keyof typeof REGION_FEATURES;

export const EU_LLM_MODELS = [
  "openai:gpt-5.5",
  "openai:gpt-4.1",
  "openai:gpt-5-mini",
  "openai:gpt-5-nano",
] as const;

export const EU_RERANK_MODELS = [
  "cohere:rerank-v4.0-pro",
  "cohere:rerank-v4.0-fast",
] as const;

export const EU_TURBOPUFFER_REGIONS = [
  "aws-eu-central-1",
  "aws-eu-west-1",
  "gcp-europe-west3",
  "gcp-europe-west1",
] as const;

export const EU_VERCEL_REGIONS = ["fra1", "cdg1", "arn1", "dub1"] as const;

export const EU_TRIGGER_REGION = "eu-central-1";

const LOCAL_IMAGE_PROTOCOLS = ["blob:", "data:"];

/**
 * Whether the dashboard may load an image from `src`. On EU only local
 * (same-origin, blob: or data:) images and images on the assets host
 * (NEXT_PUBLIC_ASSETS_HOSTNAME, set from ASSETS_S3_URL in next.config.ts)
 * load. On US any non-empty `src` does.
 */
export const canLoadImage = (src: string | null | undefined): src is string => {
  if (!src) return false;
  if (!isEuRegion) return true;

  if (src.startsWith("/") && !src.startsWith("//")) return true;
  if (!URL.canParse(src)) return false;

  const url = new URL(src);
  if (LOCAL_IMAGE_PROTOCOLS.includes(url.protocol)) return true;

  // Read as a literal property access so Next.js inlines it in client bundles
  const assetsHostname = process.env.NEXT_PUBLIC_ASSETS_HOSTNAME;
  return (
    url.protocol === "https:" &&
    !!assetsHostname &&
    url.hostname === assetsHostname
  );
};

export type LogErrorContext = Record<
  string,
  string | number | boolean | null | undefined
>;

export type ErrorSummary = {
  name: string;
  code?: string | number;
  status?: number;
  statusCode?: number;
};

/**
 * Only the error's type and status fields: SDK errors can carry request or
 * response bodies in their message, cause or extra properties.
 */
export const summarizeError = (error: unknown): ErrorSummary => {
  if (typeof error !== "object" || error === null) {
    return { name: typeof error };
  }

  const { name, code, status, statusCode } = error as Record<string, unknown>;
  const summary: ErrorSummary = {
    name: typeof name === "string" ? name : "Object",
  };

  if (typeof code === "string" || typeof code === "number") summary.code = code;
  if (typeof status === "number") summary.status = status;
  if (typeof statusCode === "number") summary.statusCode = statusCode;

  return summary;
};

/**
 * Logs an error. On EU only the error summary and the given context (IDs)
 * are logged.
 */
export const logError = (
  message: string,
  error: unknown,
  context?: LogErrorContext,
) => {
  if (!isEuRegion) {
    console.error(message, error);
    return;
  }

  console.error(message, {
    error: summarizeError(error),
    ...(context ? { context } : {}),
  });
};
