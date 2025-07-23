import { z } from "zod/v4";

export const NodeSchema = z.object({
  id: z.string(),
  score: z.number().min(0).max(1),
  text: z.string().optional(),
  relationships: z.record(z.string(), z.any()).optional(),
  metadata: z
    .object({
      file_directory: z.string(),
      filename: z.string(),
      filetype: z.string(),
      link_texts: z.array(z.any()).optional(),
      link_urls: z.array(z.any()).optional(),
      languages: z.array(z.any()).optional(),
      sequence_number: z.number().optional(),
    })
    .optional(),
});
