import { z } from "zod/v4";

export const paginationSchema = z.object({
  cursor: z.string().optional().describe("The cursor to paginate by."),
  cursorDirection: z
    .enum(["forward", "backward"])
    .default("forward")
    .describe("The direction to paginate by."),
  perPage: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(30)
    .describe("The number of records to return per page."),
});

export const paginationResponseSchema = <T>(recordSchema: z.ZodSchema<T>) =>
  z.object({
    records: z.array(recordSchema).describe("The records to return."),
    nextCursor: z
      .string()
      .nullable()
      .describe("The next cursor to paginate by."),
  });
