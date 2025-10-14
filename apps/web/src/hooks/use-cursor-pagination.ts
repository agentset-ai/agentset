import { useState } from "react";

export function useCursorPagination() {
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorDirection, setCursorDirection] = useState<
    "forward" | "backward"
  >("forward");
  const [cursors, setCursors] = useState<string[]>([]);

  const handleNext = ({ nextCursor }: { nextCursor?: string | null }) => {
    if (nextCursor) {
      setCursor(nextCursor);
      setCursors((prev) => [...prev, nextCursor]);
    }
  };

  const handlePrevious = () => {
    // get the cursor before the current cursor
    const previousCursor = cursors[cursors.length - 2];
    if (previousCursor) {
      setCursor(previousCursor);
      setCursors((prev) => prev.filter((c) => c !== previousCursor));
    } else {
      setCursor(null);
      setCursors([]);
    }
  };

  const reset = () => {
    setCursor(null);
    setCursors([]);
  };

  return {
    cursor: cursor ?? undefined,
    cursorDirection,
    handleNext,
    handlePrevious,
    hasPrevious: cursors.length > 0,
    reset,
  };
}
