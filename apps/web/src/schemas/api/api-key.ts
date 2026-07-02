import { z } from "zod/v4";

export const ApiKeySchema = z
  .object({
    id: z.string().describe("The unique ID of the API key."),
    label: z.string().describe("The label of the API key."),
    scope: z.string().describe("The scope of the API key."),
    organizationId: z
      .string()
      .describe("The ID of the organization that owns the API key."),
    createdAt: z.date().describe("The date and time the API key was created."),
    updatedAt: z
      .date()
      .describe("The date and time the API key was last updated."),
  })
  .meta({
    id: "api-key",
    title: "API Key",
  });

export const CreatedApiKeySchema = ApiKeySchema.extend({
  key: z
    .string()
    .describe("The full API key. It is only returned once, at creation time."),
}).meta({
  id: "created-api-key",
  title: "Created API Key",
});

export const createApiKeyBodySchema = z.object({
  label: z.string().min(1).describe("The label of the API key."),
  scope: z.enum(["all"]).default("all").describe("The scope of the API key."),
});
