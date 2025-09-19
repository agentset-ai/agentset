"use client";

import { ReactNode } from "react";
import { useChatlogs, ChatLogsContext } from "./use-logs";

// Provider component
export function ChatLogsProvider({ children }: { children: ReactNode }) {
  const chatLogs = useChatlogs();
  
  return (
    <ChatLogsContext.Provider value={chatLogs}>
      {children}
    </ChatLogsContext.Provider>
  );
}