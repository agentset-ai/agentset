"use client";

import { DeleteConfirmation } from "@/components/delete-confirmation";
import { useNamespace } from "@/contexts/namespace-context";
import { useOrganization } from "@/contexts/organization-context";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "@bprogress/next/app";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@agentset/ui";

export function DeleteNamespaceButton() {
  const { activeNamespace } = useNamespace();
  const { activeOrganization, isAdmin } = useOrganization();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutate: deleteNamespace, isPending } = useMutation(
    trpc.namespace.deleteNamespace.mutationOptions({
      onSuccess: () => {
        toast.success("Namespace deleted");
        const queryKey = trpc.namespace.getOrgNamespaces.queryKey({
          orgId: activeOrganization.id,
        });
        queryClient.setQueryData(queryKey, (old) => {
          if (!old) return old;
          return old.filter((namespace) => namespace.id !== activeNamespace.id);
        });
        void queryClient.invalidateQueries({ queryKey });
        router.push(`/${activeOrganization.slug}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete namespace");
      },
    }),
  );

  if (!isAdmin) return null;

  return (
    <DeleteConfirmation
      title="Delete Namespace"
      description="Are you sure you want to delete this namespace? This action cannot be undone."
      confirmText={activeNamespace.name}
      onConfirm={() => deleteNamespace({ namespaceId: activeNamespace.id })}
      trigger={
        <Button variant="destructive" isLoading={isPending}>
          Delete
        </Button>
      }
    />
  );
}
