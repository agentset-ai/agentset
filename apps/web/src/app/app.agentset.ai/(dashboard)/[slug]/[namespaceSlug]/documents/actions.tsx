import type { Row } from "@tanstack/react-table";
import { useNamespace } from "@/hooks/use-namespace";
import { prefixId } from "@/lib/api/ids";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CopyIcon,
  EllipsisVerticalIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { IngestJobStatus } from "@agentset/db/browser";
import { Button } from "@agentset/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@agentset/ui/dropdown-menu";

import type { JobCol } from "./columns";

export function JobActions({ row }: { row: Row<JobCol> }) {
  const queryClient = useQueryClient();
  const namespace = useNamespace();
  const trpc = useTRPC();
  const { mutate: deleteJob, isPending: isDeletePending } = useMutation(
    trpc.ingestJob.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Job deleted successfully");
        void queryClient.invalidateQueries(
          trpc.ingestJob.all.queryFilter({
            namespaceId: namespace.id,
          }),
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const { mutate: reIngestJob, isPending: isReIngestPending } = useMutation(
    trpc.ingestJob.reIngest.mutationOptions({
      onSuccess: () => {
        toast.success("Job re-ingestion started");
        void queryClient.invalidateQueries(
          trpc.ingestJob.all.queryFilter({
            namespaceId: namespace.id,
          }),
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prefixId(row.original.id, "job_"));
    toast.success("Copied ID");
  };

  const handleDelete = () => {
    deleteJob({
      namespaceId: namespace.id,
      jobId: row.original.id,
    });
  };

  const handleReIngest = () => {
    reIngestJob({
      namespaceId: namespace.id,
      jobId: row.original.id,
    });
  };

  const isDeleteDisabled =
    isDeletePending ||
    isReIngestPending ||
    row.original.status === IngestJobStatus.DELETING ||
    row.original.status === IngestJobStatus.QUEUED_FOR_DELETE;

  const isReIngestDisabled =
    isDeletePending ||
    isReIngestPending ||
    row.original.status === IngestJobStatus.PRE_PROCESSING ||
    row.original.status === IngestJobStatus.PROCESSING;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost">
          <EllipsisVerticalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleCopy}>
          <CopyIcon className="size-4" />
          Copy ID
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={isReIngestDisabled}
          onClick={handleReIngest}
        >
          <RefreshCwIcon className="size-4" />
          Re-ingest
        </DropdownMenuItem>

        <DropdownMenuItem disabled={isDeleteDisabled} onClick={handleDelete}>
          <Trash2Icon className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
