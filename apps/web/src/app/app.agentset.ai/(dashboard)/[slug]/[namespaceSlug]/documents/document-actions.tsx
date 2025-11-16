import type { Row } from "@tanstack/react-table";
import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { prefixId } from "@/lib/api/ids";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLineIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { DocumentStatus } from "@agentset/db";
import { Button } from "@agentset/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@agentset/ui/dropdown-menu";

import type { DocumentCol } from "./documents-columns";

export default function DocumentActions({ row }: { row: Row<DocumentCol> }) {
  const namespace = useNamespace();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { isPending, mutate: deleteDocument } = useMutation(
    trpc.document.delete.mutationOptions({
      onSuccess: () => {
        logEvent("document_deleted", {
          documentId: row.original.id,
          namespaceId: namespace.id,
          status: row.original.status,
        });
        toast.success("Document deleted successfully");
        void queryClient.invalidateQueries(
          trpc.document.all.queryFilter({
            namespaceId: namespace.id,
          }),
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const { mutate: getChunksDownloadUrl, isPending: isChunksPending } =
    useMutation(
      trpc.document.getChunksDownloadUrl.mutationOptions({
        onSuccess: (data) => {
          if (data?.url) {
            window.open(data.url, "_blank", "noopener,noreferrer");
          } else {
            toast.error("Could not generate chunks download link");
          }
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }),
    );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prefixId(row.original.id, "doc_"));
    toast.success("Copied ID");
  };

  const handleDelete = () => {
    deleteDocument({
      documentId: row.original.id,
      namespaceId: namespace.id,
    });
  };

  const handleDownloadChunks = () => {
    getChunksDownloadUrl({
      documentId: row.original.id,
      namespaceId: namespace.id,
    });
  };

  const isDeleteDisabled =
    isPending ||
    row.original.status === DocumentStatus.DELETING ||
    row.original.status === DocumentStatus.QUEUED_FOR_DELETE;

  const canDownloadChunks = row.original.status === DocumentStatus.COMPLETED;

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

        {canDownloadChunks && (
          <DropdownMenuItem
            disabled={isChunksPending}
            onClick={handleDownloadChunks}
          >
            <ArrowDownToLineIcon className="size-4" />
            Download chunks
          </DropdownMenuItem>
        )}

        <DropdownMenuItem disabled={isDeleteDisabled} onClick={handleDelete}>
          <Trash2Icon className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
