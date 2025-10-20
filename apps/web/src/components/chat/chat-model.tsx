import { useNamespace } from "@/hooks/use-namespace";

import {
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
} from "@agentset/ui/ai/prompt-input";
import { LLM, LLM_MODELS } from "@agentset/validation";

import { useNamespaceChatSettings } from "./chat-settings.store";

const models = Object.entries(LLM_MODELS).flatMap(([provider, models]) =>
  models.map((m) => ({
    id: `${provider}:${m.model}`,
    name: m.name,
  })),
);

export default function ChatModel() {
  const namespace = useNamespace();
  const [settings, setSettings] = useNamespaceChatSettings(namespace.id);

  return (
    <PromptInputModelSelect
      onValueChange={(value) => setSettings({ llmModel: value as LLM })}
      value={settings.llmModel}
    >
      <PromptInputModelSelectTrigger className="h-8">
        <PromptInputModelSelectValue />
      </PromptInputModelSelectTrigger>
      <PromptInputModelSelectContent>
        {models.map((modelOption) => (
          <PromptInputModelSelectItem
            key={modelOption.id}
            value={modelOption.id}
          >
            {modelOption.name}
          </PromptInputModelSelectItem>
        ))}
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  );
}
