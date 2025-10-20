"use client";

import { notFound, useParams } from "next/navigation";
import { useNamespace } from "@/hooks/use-namespace";
import { useOrganization } from "@/hooks/use-organization";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@agentset/ui/breadcrumb";
import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import { SidebarTrigger } from "@agentset/ui/sidebar";

import { NavUser } from "../app-sidebar/nav-user";
import LayoutLoader from "../layout/layout-loader";
import { NamespaceSwitcher } from "./namespace-switcher";

export default function DashboardPageWrapper({
  children,
  title,
  titleActions,
  className,
  actions,
  requireOrg = true,
  requireNamespace = false,
}: {
  children: React.ReactNode;
  title: string;
  titleActions?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  requireOrg?: boolean;
  requireNamespace?: boolean;
}) {
  const { namespaceSlug } = useParams();
  const organization = useOrganization();
  const namespace = useNamespace();

  let content = children;

  if (requireOrg) {
    if (organization.error) notFound();

    if (organization.isLoading) content = <LayoutLoader className="h-[50vh]" />;
  }

  if (requireNamespace) {
    if (namespace.error) notFound();
    if (namespace.isLoading) content = <LayoutLoader className="h-[50vh]" />;
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 lg:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          {namespaceSlug ? (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <NamespaceSwitcher />
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <h1 className="text-foreground text-sm font-medium">
                    {title}
                  </h1>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          ) : (
            <h1 className="text-base font-medium">{title}</h1>
          )}

          {titleActions}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <NavUser />
        </div>
      </header>

      <div className={cn("flex flex-1 flex-col px-8 py-10", className)}>
        {content}
      </div>
    </>
  );
}
