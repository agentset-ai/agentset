import { useMemo, useState } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

import { CodeBlock, CodeBlockCopyButton } from "@agentset/ui/ai/code-block";
import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agentset/ui/dialog";
import { Skeleton } from "@agentset/ui/skeleton";

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
    if (isLoading) return null;

    if (!config) return "{}";
    return JSON.stringify(config, null, 2);
  }, [config, isLoading]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Job Config</DialogTitle>
        </DialogHeader>

        {configStr ? (
          <CodeBlock code={configStr} language="json">
            <CodeBlockCopyButton />
          </CodeBlock>
        ) : (
          <Skeleton className="h-13 w-full" />
        )}
      </DialogContent>
    </Dialog>
  );
}
