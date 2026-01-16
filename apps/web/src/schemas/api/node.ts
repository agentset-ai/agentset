import { z } from "zod/v4";

export const NodeSchema = z.object({
  id: z.string(),
  score: z.number().min(0).max(1),
  text: z.string().optional(),
  relationships: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
