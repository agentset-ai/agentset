import { z } from "zod/v4";

export const paginationSchema = z.object({
  cursor: z
    .string()
    .meta({
      id: "pagination-cursor",
      description: "The cursor to paginate by.",
    })
    .optional(),
  cursorDirection: z
    .enum(["forward", "backward"])
    .meta({
      id: "pagination-cursor-direction",
      description: "The direction to paginate by.",
    })
    .default("forward"),
  perPage: z.coerce
    .number()
    .meta({
      id: "pagination-per-page",
      description: "The number of records to return per page.",
    })
    .min(1)
    .max(100)
    .optional()
    .default(30),
});

export const paginationResponseSchema = <T>(recordSchema: z.ZodSchema<T>) =>
  z.object({
    records: z.array(recordSchema).describe("The records to return."),
    nextCursor: z
      .string()
      .nullable()
      .describe("The next cursor to paginate by."),
  });
