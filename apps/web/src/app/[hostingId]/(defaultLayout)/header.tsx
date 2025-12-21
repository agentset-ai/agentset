"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHostingChat } from "@/components/chat/use-hosting-chat";
import { useHosting } from "@/contexts/hosting-context";
import { logEvent } from "@/lib/analytics";
import { HOSTING_PREFIX } from "@/lib/constants";
import { PlusIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@agentset/ui/tabs";

export default function Header() {
  const { title, searchEnabled } = useHosting();
  const { setMessages } = useHostingChat();
  const path = usePathname();

  const isSubPath = path.startsWith(HOSTING_PREFIX);
  const slug = isSubPath
    ? path.replace(HOSTING_PREFIX, "").split("/")[0]
    : null;

  const relativePath = slug
    ? path.replace(`${HOSTING_PREFIX}${slug}`, "")
    : path;
  const isSearch = relativePath === "/search";

  const baseUrl = isSubPath ? `${HOSTING_PREFIX}${slug}` : "";

  const resetChat = () => {
    logEvent("chat_reset", { type: "hosted" });
    setMessages([]);
  };

  return (
    <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <h2
          className="cursor-pointer text-lg font-semibold"
          onClick={resetChat}
        >
          {title}
        </h2>
      </div>

      {searchEnabled && (
        <Tabs value={isSearch ? "search" : "chat"}>
          <TabsList>
            <TabsTrigger value="chat" asChild>
              <Link href={`${baseUrl}/`}>Chat</Link>
            </TabsTrigger>

            <TabsTrigger value="search" asChild>
              <Link href={`${baseUrl}/search`}>Search</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {isSearch ? (
        <div className="h-9 w-28.5" />
      ) : (
        <Button variant="outline" onClick={resetChat}>
          <PlusIcon className="size-4" />
          New Chat
        </Button>
      )}
    </div>
  );
}
