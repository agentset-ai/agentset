"use client";

import { useParams } from "next/navigation";

import { ClientOnly } from "@agentset/ui";

import { dashboardItems, namespaceItems } from "./links";
import { NavItems } from "./nav-items";

export function SidebarLinks() {
  const { namespaceSlug } = useParams();

  return (
    <ClientOnly>
      <NavItems items={namespaceSlug ? namespaceItems : dashboardItems} />
    </ClientOnly>
  );
}
