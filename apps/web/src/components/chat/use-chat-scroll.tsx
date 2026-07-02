"use client";

import { createContext, use, useCallback, useMemo, useState } from "react";

interface ChatScrollContextValue {
  /**
   * Bumped whenever a new exchange should be anchored near the top of the
   * viewport (send / edit / regenerate). The message list reacts with a
   * one-shot scroll; nothing scrolls on stream chunks.
   */
  anchorVersion: number;
  requestAnchor: () => void;
}

const ChatScrollContext = createContext<ChatScrollContextValue>({
  anchorVersion: 0,
  requestAnchor: () => undefined,
});

export function ChatScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [anchorVersion, setAnchorVersion] = useState(0);
  const requestAnchor = useCallback(
    () => setAnchorVersion((version) => version + 1),
    [],
  );

  const value = useMemo(
    () => ({ anchorVersion, requestAnchor }),
    [anchorVersion, requestAnchor],
  );

  return (
    <ChatScrollContext.Provider value={value}>
      {children}
    </ChatScrollContext.Provider>
  );
}

export function useChatScroll() {
  return use(ChatScrollContext);
}
