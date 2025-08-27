import { useOrganization } from "@/hooks/use-organization";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@agentset/ui";

export const RevokeInvitationButton = ({
  invitationId,
}: {
  invitationId: string;
}) => {
  const { id } = useOrganization();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutateAsync: revokeInvitation, isPending: isRevoking } = useMutation({
    mutationFn: async () => {
      const data = await authClient.organization.cancelInvitation({
        invitationId,
      });

      if (data.error) {
        throw new Error(data.error.message || "Failed to revoke invitation");
      }

      return data.data;
    },
    onSuccess: (data) => {
      const queryFilter = trpc.organization.members.queryFilter({
        organizationId: id,
      });

      queryClient.setQueryData(queryFilter.queryKey, (old) => {
        if (!old) return old;

        return {
          ...old,
          invitations: old.invitations.filter((inv) => inv.id !== data.id),
        };
      });

      void queryClient.invalidateQueries(queryFilter);
      toast.success("Invitation revoked successfully");
    },
  });

  return (
    <Button
      size="sm"
      variant="destructive"
      isLoading={isRevoking}
      onClick={() => revokeInvitation()}
    >
      Revoke
    </Button>
  );
};
