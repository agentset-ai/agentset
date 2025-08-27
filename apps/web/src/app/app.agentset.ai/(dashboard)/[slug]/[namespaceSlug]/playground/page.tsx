import Link from "next/link";
import Chat from "@/components/chat";
import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import { Tabs, TabsList, TabsTrigger } from "@agentset/ui";

import ChatActions from "./chat-actions";

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ slug: string; namespaceSlug: string }>;
}) {
  const { slug, namespaceSlug } = await params;

  return (
    <DashboardPageWrapper
      title="Playground"
      className="p-0"
      titleActions={
        <Tabs value="chat">
          <TabsList>
            <TabsTrigger value="chat" asChild>
              <Link href={`/${slug}/${namespaceSlug}/playground`}>Chat</Link>
            </TabsTrigger>
            <TabsTrigger value="search" asChild>
              <Link href={`/${slug}/${namespaceSlug}/playground/search`}>
                Search
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
      actions={<ChatActions />}
      requireNamespace
    >
      <Chat />
    </DashboardPageWrapper>
  );
}
