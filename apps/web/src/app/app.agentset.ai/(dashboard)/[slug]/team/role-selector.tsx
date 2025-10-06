import type { Role } from "@/lib/auth-types";
import { ChevronDownIcon } from "lucide-react";

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@agentset/ui";

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
  role,
  setRole,
  disabled,
}: {
  role: Role;
  setRole: (role: Role) => void;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <Button variant="outline" className="ml-auto">
          {roles.find((r) => r.value === role)?.label || "Role"}{" "}
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="end">
        <Command value={role} onValueChange={(value) => setRole(value as Role)}>
          <CommandInput placeholder="Select new role..." />
          <CommandList>
            <CommandEmpty>No roles found.</CommandEmpty>
            <CommandGroup>
              {roles.map((role) => (
                <CommandItem
                  key={role.value}
                  value={role.value}
                  className="flex flex-col items-start gap-0 px-4 py-2"
                >
                  <p>{role.label}</p>
                  <p className="text-muted-foreground text-sm">
                    {role.description}
                  </p>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
