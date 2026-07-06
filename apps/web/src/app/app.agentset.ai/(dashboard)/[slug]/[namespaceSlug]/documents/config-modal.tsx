import { useMemo, useState } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { useOrganization } from "@/hooks/use-organization";
import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

import { SingleLanguageCodeBlock } from "@agentset/ui/ai/code-block";
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
  const namespace = useNamespace();
  const organization = useOrganization();
  const { data: config, isLoading } = useQuery({
    ...orpc.ingestJob.get.queryOptions({
      input: {
        jobId,
        namespaceId: namespace.id,
      },
      context: { orgId: organization.id },
      enabled: open,
      select: (res) => res.data.config,
    }),
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
          <SingleLanguageCodeBlock
            code={configStr}
            language="json"
            header={false}
          />
        ) : (
          <Skeleton className="h-13 w-full" />
        )}
      </DialogContent>
    </Dialog>
  );
}
