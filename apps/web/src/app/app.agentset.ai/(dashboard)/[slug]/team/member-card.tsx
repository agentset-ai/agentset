import type { Role } from "@/lib/auth-types";
import { useState } from "react";
import { useOrganization } from "@/hooks/use-organization";
import { logEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { EntityAvatar } from "@agentset/ui/avatar";

import RoleSelector from "./role-selector";

export const MemberCard = ({
  id,
  type,
  name,
  email,
  image,
  role: initialRole,
  showRole,
  actions,
}: {
  type: "member" | "invitation";
  id: string;
  name?: string;
  email: string;
  image?: string | null;
  role?: string | null;
  showRole?: boolean;
  actions?: React.ReactNode;
}) => {
  const [role, setRole] = useState(initialRole);
  const { id: organizationId, currentMemberId } = useOrganization();
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const { mutateAsync: updateMemberRole, isPending: isUpdatingRole } =
    useMutation({
      mutationFn: async (newRole: Role) =>
        authClient.organization.updateMemberRole({
          organizationId,
          memberId: id,
          role: newRole,
          fetchOptions: { throw: true },
        }),
      onSuccess: (result) => {
        toast.success("Member role updated");
        setRole(result.role);

        logEvent("organization_team_role_updated", {
          memberId: result.id,
          organizationId,
          oldRole: role,
          newRole: result.role,
        });

        queryClient.invalidateQueries(
          trpc.organization.members.queryFilter({
            organizationId,
          }),
        );
      },
      onError: () => {
        toast.error("Failed to update member role");
      },
    });

  const isRoleDisabled =
    !showRole ||
    isUpdatingRole ||
    type === "invitation" ||
    (type === "member" && id === currentMemberId);

  return (
    <div className="flex items-center justify-between space-x-4">
      <div className="flex items-center space-x-4">
        <EntityAvatar
          className="size-9"
          fallbackClassName="bg-muted text-foreground"
          entity={{
            id,
            name,
            logo: image,
          }}
        />

        <div>
          {name ? (
            <>
              <p className="text-sm leading-none font-medium">{name}</p>
              <p className="text-muted-foreground text-sm">{email}</p>
            </>
          ) : (
            <p className="text-sm leading-none font-medium">{email}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {role && (
          <RoleSelector
            disabled={isRoleDisabled}
            role={role as Role}
            setRole={(newRole) => {
              if (isRoleDisabled || newRole === role) return;
              updateMemberRole(newRole);
            }}
          />
        )}
        {actions}
      </div>
    </div>
  );
};
