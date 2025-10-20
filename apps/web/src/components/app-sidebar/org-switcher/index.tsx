"use client";

import type { RouterOutputs } from "@/trpc/react";
import React, { useState } from "react";
import Link from "next/link";
import { useOrganization } from "@/hooks/use-organization";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "@bprogress/next/app";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronsUpDownIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { toast } from "sonner";

import { EntityAvatar } from "@agentset/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@agentset/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@agentset/ui/sidebar";

import CreateOrganizationDialog from "./create-org-dialog";
import { OrganizationSwitcherSkeleton } from "./skeleton";

type Organization = RouterOutputs["organization"]["all"][number];

export function OrganizationSwitcher() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const activeOrganization = useOrganization();

  const trpc = useTRPC();
  const { data: organizations } = useQuery(
    trpc.organization.all.queryOptions(),
  );

  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  const { mutateAsync: setActiveOrganization, isPending } = useMutation({
    mutationFn: async (organization: Organization) => {
      const result = await authClient.organization.setActive({
        organizationId: organization.id,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    onError: () => {
      toast.error("Failed to switch organization!");
    },
  });

  const handleOrganizationChange = async (organization: Organization) => {
    if (isPending) {
      return;
    }

    router.push(`/${organization.slug}`);
    await setActiveOrganization(organization);
  };

  if (activeOrganization.isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <OrganizationSwitcherSkeleton />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <CreateOrganizationDialog
        open={createOrgOpen}
        setOpen={setCreateOrgOpen}
      />

      <SidebarMenuItem>
        <DropdownMenu>
          <div className="flex h-12 items-center pl-2">
            <Link
              href={`/${activeOrganization.slug}`}
              className="flex w-full items-center gap-2"
            >
              <EntityAvatar entity={activeOrganization} />

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeOrganization.name}
                </span>
                <span className="truncate text-xs">
                  {activeOrganization.plan.toUpperCase()}
                </span>
              </div>
            </Link>

            <DropdownMenuTrigger disabled={isPending} asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground w-fit"
              >
                <ChevronsUpDownIcon className="size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
          </div>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>

            {organizations?.map((organization) => (
              <DropdownMenuItem
                className="gap-2 p-2"
                key={organization.id}
                onClick={() => handleOrganizationChange(organization)}
              >
                <EntityAvatar
                  entity={organization}
                  className="border-border size-8 shrink-0 rounded-sm border"
                  fallbackClassName="bg-transparent rounded-none text-foreground"
                />

                <div>
                  <p>{organization.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {organization.plan.toUpperCase()}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem className="gap-2 p-2" asChild>
              <Link href={`/${activeOrganization.slug}/settings`}>
                <SettingsIcon className="size-4" />

                <div className="text-muted-foreground font-medium">
                  Settings
                </div>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={() => setCreateOrgOpen(true)}
            >
              <PlusIcon className="size-4" />

              <div className="text-muted-foreground font-medium">
                New Organization
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
