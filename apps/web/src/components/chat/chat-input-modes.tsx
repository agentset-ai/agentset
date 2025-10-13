import { memo } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { useSession } from "@/hooks/use-session";
import { BoxIcon, TelescopeIcon } from "lucide-react";

import { Button, cn } from "@agentset/ui";

import { useNamespaceChatSettings } from "./chat-settings.store";

const ChatInputModes = memo(() => {
  const { isAdmin } = useSession();

  const namespace = useNamespace();
  const [settings, setSettings] = useNamespaceChatSettings(namespace.id);

  const mode = settings.mode ?? "normal";

  const toggleMode = (newMode: typeof mode) => {
    console.log({ newMode, mode });
    setSettings({ mode: newMode === mode ? "normal" : newMode });
  };

  return (
    <div className="absolute bottom-0 left-0 flex w-fit flex-row justify-end gap-2 p-2">
      <Button
        variant={mode === "agentic" ? "default" : "outline"}
        className={cn(
          "rounded-full",
          mode === "agentic" ? "border border-transparent" : "",
        )}
        onClick={() => toggleMode("agentic")}
        size="sm"
        type="button"
      >
        <BoxIcon className="size-4" />
        Agentic
      </Button>

      {isAdmin && (
        <Button
          variant={mode === "deepResearch" ? "default" : "outline"}
          className={cn(
            "rounded-full",
            mode === "deepResearch" ? "border border-transparent" : "",
          )}
          onClick={() => toggleMode("deepResearch")}
          size="sm"
          type="button"
        >
          <TelescopeIcon className="size-4" />
          Deep Research
        </Button>
      )}
    </div>
  );
});

export default ChatInputModes;
