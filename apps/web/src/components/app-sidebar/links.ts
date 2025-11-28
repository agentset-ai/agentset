import {
  BookIcon,
  ChartNoAxesColumnIcon,
  CircleHelpIcon,
  FilesIcon,
  FoldersIcon,
  GlobeIcon,
  HomeIcon,
  MessagesSquareIcon,
  ReceiptIcon,
  RocketIcon,
  SearchIcon,
  SettingsIcon,
  UnplugIcon,
  UsersIcon,
} from "lucide-react";

import type { SidebarItemType } from ".";

const createOrgUrl = (url: string) => `/{slug}${url}`;
const createNamespaceUrl = (url: string) => `/{slug}/{namespaceSlug}${url}`;

export const dashboardItems: SidebarItemType[] = [
  {
    title: "Namespaces",
    url: createOrgUrl("/"),
    icon: FoldersIcon,
    exact: true,
  },
  {
    title: "Team",
    url: createOrgUrl("/team"),
    icon: UsersIcon,
  },
  {
    title: "Billing",
    url: createOrgUrl("/billing"),
    icon: ReceiptIcon,
  },
  {
    title: "Settings",
    icon: SettingsIcon,
    items: [
      {
        title: "General",
        url: createOrgUrl("/settings"),
        exact: true,
      },
      {
        title: "API Keys",
        url: createOrgUrl("/settings/api-keys"),
      },
      {
        title: "Danger",
        url: createOrgUrl("/settings/danger"),
        adminOnly: true,
      },
    ],
  },
];

export const namespaceItems: SidebarItemType[] = [
  {
    title: "Quick Start",
    url: createNamespaceUrl("/quick-start"),
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
  {
    title: "Connectors",
    url: createNamespaceUrl("/connectors"),
    icon: UnplugIcon,
  },
  {
    title: "Benchmarks",
    url: createNamespaceUrl("/benchmarks"),
    icon: ChartNoAxesColumnIcon,
  },
  {
    title: "Playground",
    icon: MessagesSquareIcon,
    isActive: true,
    items: [
      {
        title: "Chat",
        url: createNamespaceUrl("/playground"),
        exact: true,
      },
      {
        title: "Search",
        url: createNamespaceUrl("/playground/search"),
      },
    ],
  },
  {
    title: "Hosting",
    url: createNamespaceUrl("/hosting"),
    icon: GlobeIcon,
  },
  {
    title: "Settings",
    icon: SettingsIcon,
    items: [
      {
        title: "Danger",
        url: createNamespaceUrl("/settings/danger"),
        adminOnly: true,
      },
    ],
  },
];

export const supportItems: SidebarItemType[] = [
  {
    title: "Docs",
    url: "https://docs.agentset.ai",
    icon: BookIcon,
    external: true,
  },
  {
    title: "Help",
    url: "mailto:support@agentset.ai",
    icon: CircleHelpIcon,
    external: true,
  },
];
