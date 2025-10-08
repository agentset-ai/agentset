"use client";

import Chat from "@/components/chat";
import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import ChatActions from "./chat-actions";

export default function PlaygroundPage() {
  return (
    <DashboardPageWrapper
      title="Chat"
      className="p-0"
      actions={<ChatActions />}
      requireNamespace
    >
      <Chat />
    </DashboardPageWrapper>
  );
}
