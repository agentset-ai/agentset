import type { OrganizationOutputs } from "@/server/orpc/types";
import { useOrganization } from "@/hooks/use-organization";
import { logEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useORPC } from "@/orpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";

export const RevokeInvitationButton = ({
  invitationId,
}: {
  invitationId: string;
}) => {
  const { id } = useOrganization();
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const { mutateAsync: revokeInvitation, isPending: isRevoking } = useMutation({
    mutationFn: async () => {
      return authClient.organization.cancelInvitation({
        invitationId,
        fetchOptions: { throw: true },
      });
    },
    onSuccess: (data) => {
      const queryKey = orpc.organization.members.key({
        input: { organizationId: id },
      });

      queryClient.setQueryData(
        queryKey,
        (old?: OrganizationOutputs["members"]) => {
          if (!old) return old;

          return {
            ...old,
            invitations: old.invitations.filter((inv) => inv.id !== data.id),
          };
        },
      );

      void queryClient.invalidateQueries({ queryKey });
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
