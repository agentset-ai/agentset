import { z } from "zod/v4";

const turboPufferRegions = [
  "gcp-us-central1",
  "gcp-us-west1",
  "gcp-us-east4",
  "gcp-northamerica-northeast2",
  "gcp-europe-west3",
  "gcp-asia-southeast1",
  "gcp-gcp-asia-northeast3",
  "aws-eu-central-1",
  "aws-eu-west-1",
  "aws-us-east-1",
  "aws-us-west-2",
  "aws-ap-southeast-2",
  "aws-us-east-2",
  "aws-ap-south-1",
] as const;

export const regionEnum = z.enum(turboPufferRegions).meta({
  id: "turbopuffer-region-enum",
  description:
    "The region for the Turbopuffer index. Check https://turbopuffer.com/docs/regions",
});

export const TurbopufferVectorStoreConfigSchema = z
  .object({
    provider: z.literal("TURBOPUFFER"),
    apiKey: z.string().describe("The API key for the Turbopuffer index."),
    region: regionEnum,
  })
  .meta({
    id: "turbopuffer-config",
    title: "Turbopuffer Config",
  });
