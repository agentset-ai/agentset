import { useState } from "react";
import {
  useChatSettings,
  useNamespaceChatSettings,
} from "@/components/chat/chat-settings.store";
import { RerankerSelector } from "@/components/reranker-selector";
import { useNamespace } from "@/hooks/use-namespace";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agentset/ui/dialog";
import { Input } from "@agentset/ui/input";
import { Label } from "@agentset/ui/label";
import { Textarea } from "@agentset/ui/textarea";

const defaultPrompt = DEFAULT_SYSTEM_PROMPT.compile().trim();

export default function ChatSettings({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const namespace = useNamespace();
  const [open, setOpen] = useState(false);

  const [settings, setSettings] = useNamespaceChatSettings(namespace.id);
  const resetSettings = useChatSettings((s) => s.reset);

  const [topK, setTopK] = useState(settings.topK);
  const [rerankLimit, setRerankLimit] = useState(settings.rerankLimit);
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [rerankModel, setRerankModel] = useState(settings.rerankModel);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (rerankLimit > topK) {
      toast.error("Rerank limit cannot be greater than top K");
      return;
    }

    setSettings({
      topK,
      rerankLimit,
      systemPrompt: systemPrompt && systemPrompt !== "" ? systemPrompt : null,
      temperature,
      rerankModel,
    });

    setOpen(false);
  };

  const handleReset = () => {
    const newState = resetSettings(namespace.id);

    setTopK(newState.topK);
    setRerankLimit(newState.rerankLimit);
    setSystemPrompt(newState.systemPrompt);
    setTemperature(newState.temperature);
    setRerankModel(newState.rerankModel);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

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

          <div className="grid gap-2">
            <Label>Re-ranker Model</Label>
            <RerankerSelector
              value={rerankModel}
              onValueChange={setRerankModel}
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
