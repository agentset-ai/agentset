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
    const previousCursor = cursors[cursors.length - 1];
    if (previousCursor) {
      setCursor(previousCursor);
      setCursors((prev) => prev.filter((c) => c !== previousCursor));
    } else {
      setCursor(null);
    }
  };

  const reset = () => {
    setCursor(null);
    setCursorDirection("forward");
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
