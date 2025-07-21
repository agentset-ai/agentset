import { z } from "zod/v4";

export const hostingSearchSchema = z.object({
  query: z.string(),
});
