import { useMemo, useState } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agentset/ui/dialog";

export function ConfigModal({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();
  const namespace = useNamespace();
  const { data: config, isLoading } = useQuery({
    ...trpc.ingestJob.getConfig.queryOptions(
      {
        jobId,
        namespaceId: namespace.id,
      },
      { enabled: open },
    ),
  });

  const configStr = useMemo(() => {
    if (isLoading) return "Loading...";
    if (!config) return "None";

    return JSON.stringify(config, null, 2);
  }, [config, isLoading]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
          Show Config
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Job Config</DialogTitle>
        </DialogHeader>
        <pre className="bg-muted max-h-[60vh] overflow-auto rounded-md p-4">
          {configStr}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
