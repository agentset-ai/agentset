import { memo } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { TargetIcon, ZapIcon } from "lucide-react";
import { useIsClient } from "usehooks-ts";

import { PromptInputButton } from "@agentset/ui/ai/prompt-input";

import { useNamespaceChatSettings } from "./chat-settings.store";

const PureChatInputModes = () => {
  const namespace = useNamespace();
  const [settings, setSettings] = useNamespaceChatSettings(namespace.id);
  const mode = settings.mode === "fast" ? "fast" : "accurate";
  const isClient = useIsClient();

  return (
    <>
      <PromptInputButton
        variant={mode === "accurate" ? "default" : "ghost"}
        onClick={() => setSettings({ mode: "accurate" })}
        disabled={!isClient}
      >
        <TargetIcon className="size-4" />
        Accurate
      </PromptInputButton>

      <PromptInputButton
        variant={mode === "fast" ? "default" : "ghost"}
        onClick={() => setSettings({ mode: "fast" })}
        disabled={!isClient}
      >
        <ZapIcon className="size-4" />
        Fast
      </PromptInputButton>
    </>
  );
};

const ChatInputModes = memo(PureChatInputModes);

export default ChatInputModes;
