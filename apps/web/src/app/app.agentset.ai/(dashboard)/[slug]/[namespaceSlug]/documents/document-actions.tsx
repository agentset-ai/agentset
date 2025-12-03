import type { Row } from "@tanstack/react-table";
import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { prefixId } from "@/lib/api/ids";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CopyIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { DocumentStatus } from "@agentset/db/browser";
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
        toast.success("Document queued for deletion");
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

  const { isPending: isDownloading, mutate: getDownloadUrl } = useMutation(
    trpc.document.getFileDownloadUrl.mutationOptions({
      onSuccess: ({ url }) => {
        window.open(url, "_blank");
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

  const handleDownload = () => {
    getDownloadUrl({
      documentId: row.original.id,
      namespaceId: namespace.id,
    });
  };

  const handleDelete = () => {
    deleteDocument({
      documentId: row.original.id,
      namespaceId: namespace.id,
    });
  };

  const isDeleteDisabled =
    isPending ||
    row.original.status === DocumentStatus.DELETING ||
    row.original.status === DocumentStatus.QUEUED_FOR_DELETE;

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

        {row.original.source.type === "MANAGED_FILE" && (
          <DropdownMenuItem disabled={isDownloading} onClick={handleDownload}>
            <DownloadIcon className="size-4" />
            Download File
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
