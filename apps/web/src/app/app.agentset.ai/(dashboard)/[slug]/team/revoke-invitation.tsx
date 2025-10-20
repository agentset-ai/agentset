import { useOrganization } from "@/hooks/use-organization";
import { logEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";

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
      return authClient.organization.cancelInvitation({
        invitationId,
        fetchOptions: { throw: true },
      });
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

  const handleRevokeInvitation = async () => {
    logEvent("team_revoke_invitation", {
      organizationId: id,
      invitationId,
    });
    await revokeInvitation();
  };

  return (
    <Button
      size="sm"
      variant="destructive"
      isLoading={isRevoking}
      onClick={handleRevokeInvitation}
    >
      Revoke
    </Button>
  );
};
