import type { Row } from "@tanstack/react-table";
import { DeleteConfirmation } from "@/components/delete-confirmation";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, EllipsisVerticalIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { Button } from "@agentset/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@agentset/ui/dropdown-menu";

import type { ApiKeyDef } from "./columns";

export function ApiKeyActions({ row }: { row: Row<ApiKeyDef> }) {
  const [, copyToClipboard] = useCopyToClipboard();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const orgId = row.original.organizationId;
  const id = row.original.id;

  const { mutateAsync: deleteApiKey, isPending } = useMutation(
    trpc.apiKey.deleteApiKey.mutationOptions({
      onSuccess: () => {
        const queryFilter = trpc.apiKey.getApiKeys.queryFilter({ orgId });
        queryClient.setQueryData(queryFilter.queryKey, (old) => {
          if (!old) return [];
          return old.filter((key) => key.id !== id);
        });
        void queryClient.invalidateQueries(queryFilter);

        toast.success("API key deleted");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleDelete = async () => {
    await deleteApiKey({ orgId, id });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <EllipsisVerticalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem
          onSelect={(e) => {
            copyToClipboard(row.original.key).then((success) => {
              if (success) {
                toast.success("API key copied to clipboard");
              } else {
                toast.error("Failed to copy API key");
              }
            });
          }}
        >
          <CopyIcon className="size-4" />
          Copy API Key
        </DropdownMenuItem>
        <DeleteConfirmation
          trigger={
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              disabled={isPending}
            >
              <Trash2Icon className="size-4" />
              Delete
            </DropdownMenuItem>
          }
          title="Delete API Key"
          description={`Are you sure you want to delete the API key "${row.original.label}"? This action cannot be undone and will immediately revoke access for any applications using this key.`}
          onConfirm={handleDelete}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
