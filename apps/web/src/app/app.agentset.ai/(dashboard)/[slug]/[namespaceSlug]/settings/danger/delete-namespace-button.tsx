"use client";

import { DeleteConfirmation } from "@/components/delete-confirmation";
import { useNamespace } from "@/hooks/use-namespace";
import { useOrganization } from "@/hooks/use-organization";
import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "@bprogress/next/app";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";

export function DeleteNamespaceButton() {
  const namespace = useNamespace();
  const organization = useOrganization();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutate: deleteNamespace, isPending } = useMutation(
    trpc.namespace.deleteNamespace.mutationOptions({
      onSuccess: () => {
        logEvent("namespace_deleted", {
          id: namespace.id,
          name: namespace.name,
          organizationId: organization.id,
        });
        toast.success("Namespace deleted");
        const queryKey = trpc.namespace.getOrgNamespaces.queryKey({
          slug: organization.slug,
        });
        queryClient.setQueryData(queryKey, (old) => {
          if (!old) return old;
          return old.filter((ns) => ns.id !== namespace.id);
        });
        void queryClient.invalidateQueries({ queryKey });
        router.push(`/${organization.slug}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete namespace");
      },
    }),
  );

  if (!organization.isAdmin) return null;

  return (
    <DeleteConfirmation
      title="Delete Namespace"
      description="Are you sure you want to delete this namespace? This action cannot be undone."
      confirmText={namespace.name}
      onConfirm={() => deleteNamespace({ namespaceId: namespace.id })}
      trigger={
        <Button variant="destructive" isLoading={isPending}>
          Delete
        </Button>
      }
    />
  );
}
