import { memo } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { useIsClient } from "usehooks-ts";

import { Tabs, TabsList, TabsTrigger } from "@agentset/ui/tabs";

import type { ChatMode } from "./chat-settings.store";
import { useNamespaceChatSettings } from "./chat-settings.store";

const PureChatInputModes = () => {
  const namespace = useNamespace();
  const [settings, setSettings] = useNamespaceChatSettings(namespace.id);
  const mode: ChatMode = settings.mode === "fast" ? "fast" : "accurate";
  const isClient = useIsClient();

  return (
    <Tabs
      value={mode}
      onValueChange={(value) => setSettings({ mode: value as ChatMode })}
    >
      <TabsList>
        <TabsTrigger value="accurate" className="px-2.5" disabled={!isClient}>
          Accurate
        </TabsTrigger>
        <TabsTrigger value="fast" className="px-2.5" disabled={!isClient}>
          Fast
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

const ChatInputModes = memo(PureChatInputModes);

export default ChatInputModes;
