import z4 from "zod/v4";

export const namespaceIdSchema = z4
  .string()
  .describe("The id of the namespace (prefixed with ns_)")
  .meta({ examples: ["ns_123"] });
