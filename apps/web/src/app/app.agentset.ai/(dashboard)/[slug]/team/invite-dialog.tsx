"use client";

import type { Role } from "@/lib/auth-types";
import type { OrganizationOutputs } from "@/server/orpc/types";
import { useState } from "react";
import { useOrganization } from "@/hooks/use-organization";
import { logEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useORPC } from "@/orpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agentset/ui/dialog";
import { Input } from "@agentset/ui/input";
import { Label } from "@agentset/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agentset/ui/select";

function InviteMemberDialog() {
  const [open, setOpen] = useState(false);
  const { id, isAdmin } = useOrganization();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { mutateAsync: invite, isPending } = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      return authClient.organization.inviteMember({
        email: email,
        role: role as Role,
        organizationId: id,
        fetchOptions: { throw: true },
      });
    },
    onSuccess: (result) => {
      const queryKey = orpc.organization.members.key({
        input: { organizationId: id },
      });

      queryClient.setQueryData(
        queryKey,
        (old?: OrganizationOutputs["members"]) => {
          if (!old) return old;
          return {
            ...old,
            invitations: [...old.invitations, result],
          };
        },
      );

      void queryClient.invalidateQueries({ queryKey });

      setOpen(false);
    },
  });

  const handleInvite = () => {
    logEvent("team_invite_member_clicked", {
      organizationId: id,
      email,
      role,
    });
    void toast.promise(invite({ email, role }), {
      loading: "Inviting member...",
      success: "Member invited successfully",
      error: (error: { error?: { message?: string } }) =>
        error.error?.message || "Failed to invite member",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={!isAdmin}>
        <Button>
          <PlusIcon className="size-4" />
          Invite Member
        </Button>
      </DialogTrigger>

      <DialogContent className="w-11/12 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Invite a member to your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label>Email</Label>
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button isLoading={isPending} onClick={handleInvite}>
            Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InviteMemberDialog;
