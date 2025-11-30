import type { ApiKeyOutputs } from "@/server/orpc/types";
import type { Row } from "@tanstack/react-table";
import { DeleteConfirmation } from "@/components/delete-confirmation";
import { useORPC } from "@/orpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EllipsisVerticalIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@agentset/ui/dropdown-menu";

import type { ApiKeyDef } from "./columns";

export function ApiKeyActions({ row }: { row: Row<ApiKeyDef> }) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const orgId = row.original.organizationId;
  const id = row.original.id;

  const { mutateAsync: deleteApiKey, isPending } = useMutation(
    orpc.apiKey.deleteApiKey.mutationOptions({
      onSuccess: () => {
        const queryKey = orpc.apiKey.getApiKeys.key({ input: { orgId } });
        queryClient.setQueryData(
          queryKey,
          (old?: ApiKeyOutputs["getApiKeys"]) => {
            if (!old) return old;
            return old.filter((key) => key.id !== id);
          },
        );
        void queryClient.invalidateQueries({ queryKey });

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
