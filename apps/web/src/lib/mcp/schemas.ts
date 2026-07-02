import { z } from "zod/v4";

export const namespaceIdSchema = z
  .string()
  .describe(
    "The ID of the namespace to operate on (e.g. `ns_xxx`). Use list_namespaces to find it.",
  );
