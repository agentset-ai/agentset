import { useState } from "react";
import { useChatSettings } from "@/components/chat/chat-settings.store";
import { useNamespace } from "@/hooks/use-namespace";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { Settings2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea,
} from "@agentset/ui";

const defaultPrompt = DEFAULT_SYSTEM_PROMPT.compile().trim();

export default function ChatSettings() {
  const namespace = useNamespace();
  const [open, setOpen] = useState(false);
  const store = useChatSettings();
  const currentState = store.getNamespace(namespace.id);

  const [topK, setTopK] = useState(currentState.topK);
  const [rerankLimit, setRerankLimit] = useState(currentState.rerankLimit);
  const [systemPrompt, setSystemPrompt] = useState(currentState.systemPrompt);
  const [temperature, setTemperature] = useState(currentState.temperature);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (rerankLimit > topK) {
      toast.error("Rerank limit cannot be greater than top K");
      return;
    }

    if (topK !== currentState.topK) {
      store.setTopK(namespace.id, topK);
    }
    if (rerankLimit !== currentState.rerankLimit) {
      store.setRerankLimit(namespace.id, rerankLimit);
    }

    if (systemPrompt !== currentState.systemPrompt) {
      store.setSystemPrompt(
        namespace.id,
        systemPrompt && systemPrompt !== "" ? systemPrompt : null,
      );
    }

    if (temperature !== currentState.temperature) {
      store.setTemperature(namespace.id, temperature);
    }

    setOpen(false);
  };

  const handleReset = () => {
    const newState = store.reset(namespace.id);
    setTopK(newState.topK);
    setRerankLimit(newState.rerankLimit);
    setSystemPrompt(newState.systemPrompt);
    setTemperature(newState.temperature);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2Icon className="size-4" />
          Parameters
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Parameters</DialogTitle>
          <DialogDescription>
            Customize the parameters for the chat.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4 py-4" onSubmit={handleSave}>
          <div className="grid gap-2">
            <Label>Top K</Label>
            <Input
              type="number"
              min={1}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
            />
          </div>

          <div className="grid gap-2">
            <Label>Rerank Limit</Label>
            <Input
              type="number"
              min={1}
              value={rerankLimit}
              onChange={(e) => setRerankLimit(Number(e.target.value))}
            />
          </div>

          <div className="grid gap-2">
            <Label>System Prompt</Label>
            <Textarea
              value={systemPrompt ?? defaultPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="max-h-[200px]"
            />
          </div>

          <div className="grid gap-2">
            <Label>Temperature</Label>
            <Input
              type="number"
              value={temperature}
              min={0}
              max={1}
              step={0.1}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </div>

          <DialogFooter className="mt-5 flex justify-between">
            <Button variant="outline" onClick={handleReset} type="button">
              Reset
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
