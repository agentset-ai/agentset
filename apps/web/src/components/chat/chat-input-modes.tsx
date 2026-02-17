import { memo } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { useSession } from "@/hooks/use-session";
import { BoxIcon, TelescopeIcon } from "lucide-react";
import { useIsClient } from "usehooks-ts";

import { PromptInputButton } from "@agentset/ui/ai/prompt-input";

import { useNamespaceChatSettings } from "./chat-settings.store";

const PureChatInputModes = () => {
  const { isAdmin } = useSession();
  const namespace = useNamespace();
  const [settings, setSettings] = useNamespaceChatSettings(namespace.id);
  const mode = settings.mode ?? "normal";
  const isClient = useIsClient();

  const toggleMode = (newMode: typeof mode) => {
    setSettings({ mode: newMode === mode ? "normal" : newMode });
  };

  return (
    <>
      <PromptInputButton
        variant={mode === "agentic" ? "default" : "ghost"}
        onClick={() => toggleMode("agentic")}
        disabled={!isClient}
      >
        <BoxIcon className="size-4" />
        Agentic
      </PromptInputButton>

      {isAdmin && (
        <PromptInputButton
          variant={mode === "deepResearch" ? "default" : "ghost"}
          onClick={() => toggleMode("deepResearch")}
          disabled={!isClient}
        >
          <TelescopeIcon className="size-4" />
          Deep Research
        </PromptInputButton>
      )}
    </>
  );
};

const ChatInputModes = memo(PureChatInputModes);

export default ChatInputModes;
