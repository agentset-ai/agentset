import type { paginationSchema } from "@/schemas/api/pagination";
import type { z } from "zod/v4";
import { normalizeId } from "@/lib/api/ids";
import { decodeCursor, encodeCursor } from "@/lib/cursor";

import { Prisma } from "@agentset/db";

// flip sort helper
const flip = (s: Prisma.SortOrder): Prisma.SortOrder =>
  s === "desc" ? "asc" : "desc";

export function buildCursorWhere(
  cursor: string,
  scanSort: Prisma.SortOrder,
  cursorPrefix: Parameters<typeof normalizeId>[1],
) {
  const operation = scanSort === "desc" ? "lt" : "gt";
  const cursorPayload = decodeCursor(cursor);

  return {
    OR: [
      { createdAt: { [operation]: new Date(cursorPayload.createdAt) } },
      {
        AND: [
          { createdAt: new Date(cursorPayload.createdAt) },
          {
            id: {
              [operation]: cursorPrefix
                ? normalizeId(cursorPayload.id, cursorPrefix)
                : cursorPayload.id,
            },
          },
        ],
      },
    ],
  };
}

export const getPaginationArgs = (
  input: z.infer<typeof paginationSchema>,
  orderInput: { orderBy: string; order: Prisma.SortOrder },
  cursorPrefix: Parameters<typeof normalizeId>[1],
) => {
  // For backward pagination we scan in the opposite direction, then reverse results.
  const scanSort =
    input.cursorDirection === "backward"
      ? flip(orderInput.order)
      : orderInput.order;
  const orderBy = [{ createdAt: scanSort }, { id: scanSort }];

  return {
    ...(input.cursor
      ? {
          where: buildCursorWhere(input.cursor, scanSort, cursorPrefix),
        }
      : {}),
    orderBy,
    take: input.perPage + 1,
  };
};

export const paginateResults = <T extends { id: string; createdAt: Date }>(
  input: z.infer<typeof paginationSchema>,
  results: T[],
) => {
  // If we scanned backwards, flip back so caller sees items in requested `order`
  let items =
    input.cursorDirection === "backward" ? results.reverse() : results;
  const hasMore = items.length > input.perPage;
  if (hasMore) items = items.slice(0, input.perPage);

  // Build cursors from visible edges (always use createdAt+id)
  const first = items[0];
  const last = items[items.length - 1];

  const nextCursor = hasMore && last ? encodeCursor(last) : null;
  const prevCursor = first ? encodeCursor(first) : null;

  return {
    records: items,
    pagination: {
      hasMore,
      nextCursor,
      prevCursor,
    },
  };
};
