import type { ApiKeyOutputs } from "@/server/orpc/types";
import { useState } from "react";
import { logEvent } from "@/lib/analytics";
import { useORPC } from "@/orpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";
import { CopyButton } from "@agentset/ui/copy-button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agentset/ui/select";

export default function CreateApiKey({ orgId }: { orgId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"all">("all");
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const {
    isPending,
    mutate: createApiKey,
    data,
    reset,
  } = useMutation(
    orpc.apiKey.createApiKey.mutationOptions({
      onSuccess: (newKey) => {
        logEvent("api_key_created", {
          orgId,
          scope: newKey.scope,
        });

        const queryKey = orpc.apiKey.getApiKeys.key({ input: { orgId } });

        queryClient.setQueryData(
          queryKey,
          (old?: ApiKeyOutputs["getApiKeys"]) => {
            if (!old) return old;
            return [...old, newKey];
          },
        );

        toast.success("API key created");
        void queryClient.invalidateQueries({ queryKey });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createApiKey({ orgId, label, scope });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(newOpen) => {
        if (isPending) return;
        setIsOpen(newOpen);
        if (!newOpen) {
          // Reset form and mutation state when modal closes
          setLabel("");
          setScope("all");
          reset();
        }
      }}
    >
      <div>
        <DialogTrigger asChild>
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" /> New API key
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-[425px]">
        {data ? (
          <div>
            <DialogHeader>
              <DialogTitle>Here is your API Key</DialogTitle>
            </DialogHeader>

            <pre className="bg-muted relative mt-5 flex-1 rounded-md p-4">
              {data.key}
              <CopyButton
                className="absolute top-1 right-1"
                textToCopy={data.key}
              />
            </pre>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Create a new API key to start ingesting data.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="label" className="text-right">
                  Label
                </Label>
                <Input
                  id="label"
                  placeholder="Next.js app"
                  className="col-span-3"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="scope" className="text-right">
                  Scope
                </Label>

                <Select
                  value={scope}
                  onValueChange={(value) => setScope(value as "all")}
                >
                  <SelectTrigger id="scope" className="col-span-3">
                    <SelectValue placeholder="Select a scope" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" isLoading={isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
