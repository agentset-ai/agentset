import {
  AlertTriangleIcon,
  CodeIcon,
  CreditCardIcon,
  FilesIcon,
  HelpCircleIcon,
  HomeIcon,
  LockIcon,
  RocketIcon,
  SettingsIcon,
  UnplugIcon,
  UsersIcon,
} from "lucide-react";

import type { SidebarItemType } from ".";

const createOrgUrl = (url: string) => `/{slug}${url}`;

export const secondaryItems: SidebarItemType[] = [
  {
    title: "Get Help",
    icon: HelpCircleIcon,
    url: createOrgUrl("/help"),
  },
];

const createNamespaceUrl = (url: string) => `/{slug}/{namespaceSlug}${url}`;

export const namespaceItems: SidebarItemType[] = [
  {
    title: "Get Started",
    url: createNamespaceUrl("/get-started"),
    icon: RocketIcon,
    exact: true,
  },
  {
    title: "Dashboard",
    url: createNamespaceUrl("/"),
    icon: HomeIcon,
    exact: true,
  },
  {
    title: "Documents",
    url: createNamespaceUrl("/documents"),
    icon: FilesIcon,
  },
  // {
  //   title: "Connectors",
  //   url: createNamespaceUrl("/connectors"),
  //   icon: UnplugIcon,
  // },
  {
    title: "Playground",
    url: createNamespaceUrl("/playground"),
    icon: CodeIcon,
  },
];

export const settingsItems: SidebarItemType[] = [
  {
    title: "General",
    url: createOrgUrl("/settings"),
    icon: SettingsIcon,
    exact: true,
  },
  {
    title: "API Keys",
    url: createOrgUrl("/settings/api-keys"),
    icon: LockIcon,
  },
  {
    title: "Team",
    url: createOrgUrl("/settings/team"),
    icon: UsersIcon,
  },
  {
    title: "Billing",
    url: createOrgUrl("/settings/billing"),
    icon: CreditCardIcon,
  },
  {
    title: "Danger",
    url: createOrgUrl("/settings/danger"),
    icon: AlertTriangleIcon,
    adminOnly: true,
  },
];
