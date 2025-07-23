import type { paginationSchema } from "@/schemas/api/pagination";
import type { z } from "zod/v4";
import { normalizeId } from "@/lib/api/ids";

export const getPaginationArgs = (
  input: z.infer<typeof paginationSchema>,
  cursorPrefix?: Parameters<typeof normalizeId>[1],
) => {
  return {
    take: (input.perPage + 1) * (input.cursorDirection === "forward" ? 1 : -1),
    cursor: input.cursor
      ? {
          id: cursorPrefix
            ? normalizeId(input.cursor, cursorPrefix)
            : input.cursor,
        }
      : undefined,
  };
};

export const paginateResults = <T extends { id: string }>(
  input: z.infer<typeof paginationSchema>,
  results: T[],
) => {
  return {
    records: results.slice(0, input.perPage),
    nextCursor:
      results.length > input.perPage
        ? (results[results.length - 1]?.id ?? null)
        : null,
  };
};
