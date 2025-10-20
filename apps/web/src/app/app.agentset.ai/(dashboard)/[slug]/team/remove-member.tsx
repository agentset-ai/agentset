import { useOrganization } from "@/hooks/use-organization";
import { logEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "@bprogress/next/app";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";

export const RemoveMemberButton = ({
  memberId,
  currentMemberId,
}: {
  memberId: string;
  currentMemberId?: string;
}) => {
  const { id } = useOrganization();
  const router = useRouter();
  const isCurrentMember = currentMemberId === memberId;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutateAsync: removeMember, isPending: isRemoving } = useMutation({
    mutationFn: async () => {
      return authClient.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId: id,
        fetchOptions: { throw: true },
      });
    },
    onSuccess: () => {
      const queryFilter = trpc.organization.members.queryFilter({
        organizationId: id,
      });

      queryClient.setQueryData(queryFilter.queryKey, (old) => {
        if (!old) return old;

        return {
          ...old,
          members: old.members.filter((m) => m.id !== memberId),
        };
      });
      void queryClient.invalidateQueries(queryFilter);

      toast.success("Member removed successfully");

      if (isCurrentMember) {
        router.push("/");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleRemoveMember = async () => {
    logEvent("team_remove_member", {
      organizationId: id,
      memberId,
      isCurrentMember,
    });
    await removeMember();
  };

  return (
    <Button
      size="sm"
      variant="destructive"
      isLoading={isRemoving}
      onClick={handleRemoveMember}
    >
      {isCurrentMember ? "Leave" : "Remove"}
    </Button>
  );
};
