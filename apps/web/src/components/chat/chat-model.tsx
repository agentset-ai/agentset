import { useState } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { CheckIcon } from "lucide-react";

import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@agentset/ui/ai/model-selector";
import { Button } from "@agentset/ui/button";
import { LLM, LLM_MODELS, LLM_PROVIDERS } from "@agentset/validation";

import { useNamespaceChatSettings } from "./chat-settings.store";

const models = Object.entries(LLM_MODELS).flatMap(([provider, models]) =>
  models.map((m) => ({
    id: `${provider}:${m.model}`,
    name: m.name,
    providerSlug: provider,
  })),
);

export default function ChatModel() {
  const namespace = useNamespace();
  const [settings, setSettings] = useNamespaceChatSettings(namespace.id);
  const [open, setOpen] = useState(false);

  const selectedModelData = models.find(
    (model) => model.id === settings.llmModel,
  );

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Button variant="ghost">
          {selectedModelData?.providerSlug && (
            <ModelSelectorLogo provider={selectedModelData.providerSlug} />
          )}
          {selectedModelData?.name && (
            <ModelSelectorName>{selectedModelData.name}</ModelSelectorName>
          )}
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {Object.entries(LLM_PROVIDERS).map(([providerSlug, name]) => (
            <ModelSelectorGroup heading={name} key={providerSlug}>
              {models
                .filter((model) => model.providerSlug === providerSlug)
                .map((model) => (
                  <ModelSelectorItem
                    key={model.id}
                    onSelect={() => {
                      setSettings({ llmModel: model.id as LLM });
                      setOpen(false);
                    }}
                    value={model.id}
                  >
                    <ModelSelectorLogo provider={model.providerSlug} />
                    <ModelSelectorName>{model.name}</ModelSelectorName>

                    {settings.llmModel === model.id ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : (
                      <div className="ml-auto size-4" />
                    )}
                  </ModelSelectorItem>
                ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
