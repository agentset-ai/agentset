"use client";

import { DeleteConfirmation } from "@/components/delete-confirmation";
import { useOrganization } from "@/hooks/use-organization";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "@bprogress/next/app";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";

export function DeleteOrgButton() {
  const organization = useOrganization();
  const router = useRouter();
  const trpc = useTRPC();
  const { mutate: deleteOrganization, isPending } = useMutation(
    trpc.organization.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Organization deleted");
        router.push("/");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete organization");
      },
    }),
  );

  if (!organization.isAdmin) return null;

  return (
    <DeleteConfirmation
      title="Delete Organization"
      description="Are you sure you want to delete this organization? This action cannot be undone."
      confirmText={organization.name}
      onConfirm={() => deleteOrganization({ organizationId: organization.id })}
      trigger={
        <Button variant="destructive" isLoading={isPending}>
          Delete
        </Button>
      }
    />
  );
}
