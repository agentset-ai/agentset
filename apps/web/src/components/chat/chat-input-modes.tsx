import { memo } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { useSession } from "@/hooks/use-session";
import { BoxIcon, TelescopeIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Button, cn } from "@agentset/ui";

import { useChatSettings } from "./chat-settings.store";

const ChatInputModes = memo(() => {
  const { isAdmin } = useSession();

  const namespace = useNamespace();
  const settings = useChatSettings(
    useShallow((s) => {
      const namespaceSettings = s.getNamespace(namespace.id);
      return {
        mode: namespaceSettings.mode,
        setMode: s.setMode,
      };
    }),
  );

  const currentMode = settings.mode ?? "normal";

  const toggleMode = (mode: typeof currentMode) => {
    settings.setMode(namespace.id, mode === currentMode ? "normal" : mode);
  };

  return (
    <div className="absolute bottom-0 left-0 flex w-fit flex-row justify-end gap-2 p-2">
      <Button
        variant={currentMode === "agentic" ? "default" : "outline"}
        className={cn(
          "rounded-full",
          currentMode === "agentic" ? "border border-transparent" : "",
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
          variant={currentMode === "deepResearch" ? "default" : "outline"}
          className={cn(
            "rounded-full",
            currentMode === "deepResearch" ? "border border-transparent" : "",
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
