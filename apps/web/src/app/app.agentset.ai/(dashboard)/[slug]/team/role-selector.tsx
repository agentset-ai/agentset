import type { Role } from "@/lib/auth-types";
import { useState } from "react";
import { useOrganization } from "@/hooks/use-organization";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@agentset/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@agentset/ui/popover";

const roles = [
  {
    label: "Member",
    description:
      "Cannot delete or modify resources. Cannot manage organization settings.",
    value: "member",
  },
  {
    label: "Admin",
    description: "Can view and manage everything. Cannot remove owners.",
    value: "admin",
  },
  {
    label: "Owner",
    description: "Can view and manage everything.",
    value: "owner",
  },
];

export default function RoleSelector({
  role: activeRole,
  setRole,
  disabled,
}: {
  role: Role;
  setRole: (role: Role) => void;
  disabled?: boolean;
}) {
  const { isOwner } = useOrganization();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild disabled={disabled}>
          <Button variant="outline" className="ml-auto">
            {roles.find((r) => r.value === activeRole)?.label || "Role"}{" "}
            <ChevronDownIcon className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="flex flex-col gap-1 p-1" align="end">
          {roles.map((role) => (
            <button
              key={role.value}
              data-selected={role.value === activeRole}
              className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground hover:bg-accent hover:text-accent-foreground relative w-full cursor-default flex-col items-start justify-start gap-2 rounded-sm px-4 py-2 text-left text-sm outline-hidden select-none disabled:pointer-events-none disabled:opacity-50"
              onClick={() => {
                const newRole = role.value as Role;
                if (newRole === "owner") {
                  setOpen(true);
                } else {
                  setRole(newRole);
                }
              }}
              disabled={!isOwner && role.value === "owner"}
            >
              <p>{role.label}</p>
              <p className="text-muted-foreground text-xs">
                {role.description}
              </p>
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Ownership</DialogTitle>
            <DialogDescription>
              Are you sure you want to move ownership to this member? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setRole("owner");
                setOpen(false);
              }}
            >
              Move Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
