"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { ClientOnly } from "@agentset/ui/client-only";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@agentset/ui/sidebar";

import {
  dashboardItems,
  namespaceItems,
  profileItems,
  supportItems,
} from "./links";
import { NavItems } from "./nav-items";
import { OrganizationSwitcher } from "./org-switcher";
import { Usage } from "./usage";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const params = useParams();

  const activeArea = pathname.startsWith("/profile")
    ? ("profile" as const)
    : params.namespaceSlug
      ? ("namespace" as const)
      : ("dashboard" as const);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        {activeArea === "profile" ? (
          <ProfileHeader />
        ) : (
          <OrganizationSwitcher />
        )}
      </SidebarHeader>

      <SidebarContent>
        <ClientOnly>
          <NavItems
            items={
              activeArea === "namespace"
                ? namespaceItems
                : activeArea === "dashboard"
                  ? dashboardItems
                  : profileItems
            }
          />
        </ClientOnly>
      </SidebarContent>

      <SidebarFooter className="px-0">
        <NavItems items={supportItems} />
      </SidebarFooter>

      {activeArea !== "profile" && (
        <>
          <SidebarSeparator className="mr-0 -ml-2 w-[calc(100%+1rem)]!" />
          <SidebarFooter className="pb-5">
            <Usage />
          </SidebarFooter>
        </>
      )}
    </Sidebar>
  );
}

function ProfileHeader() {
  const { data: activeOrganization } = authClient.useActiveOrganization();

  return (
    <div className="flex items-center gap-2">
      <Button asChild size="icon-sm" variant="ghost">
        <Link href={activeOrganization ? `/${activeOrganization.slug}` : "/"}>
          <ChevronLeftIcon className="size-4" />
        </Link>
      </Button>
      <h2>Settings</h2>
    </div>
  );
}
