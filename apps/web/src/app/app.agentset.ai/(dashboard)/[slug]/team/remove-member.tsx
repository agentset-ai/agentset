import { useOrganization } from "@/contexts/organization-context";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "@bprogress/next/app";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@agentset/ui";

export const RemoveMemberButton = ({
  memberId,
  currentMemberId,
}: {
  memberId: string;
  currentMemberId?: string;
}) => {
  const { activeOrganization } = useOrganization();
  const router = useRouter();
  const isCurrentMember = currentMemberId === memberId;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutateAsync: removeMember, isPending: isRemoving } = useMutation({
    mutationFn: async () => {
      const data = await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId: activeOrganization.id,
      });

      if (data.error) {
        throw new Error(data.error.message || "Failed to remove member");
      }

      return data;
    },
    onSuccess: () => {
      const queryFilter = trpc.organization.members.queryFilter({
        organizationId: activeOrganization.id,
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

  return (
    <Button
      size="sm"
      variant="destructive"
      isLoading={isRemoving}
      onClick={() => removeMember()}
    >
      {isCurrentMember ? "Leave" : "Remove"}
    </Button>
  );
};
