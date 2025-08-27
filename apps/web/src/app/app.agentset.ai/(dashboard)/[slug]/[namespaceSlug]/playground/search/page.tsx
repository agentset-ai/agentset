"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import { Tabs, TabsList, TabsTrigger } from "@agentset/ui";

import SearchPageClient from "./page.client";

export default function SearchPage() {
  const { slug, namespaceSlug } = useParams();

  return (
    <DashboardPageWrapper
      title="Search"
      titleActions={
        <Tabs value="search">
          <TabsList>
            <TabsTrigger value="chat" asChild>
              <Link href={`/${slug}/${namespaceSlug}/playground`}>Chat</Link>
            </TabsTrigger>

            <TabsTrigger value="search" asChild>
              <Link href={`/${slug}/${namespaceSlug}/playground/search`}>
                Search
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
      requireNamespace
    >
      <SearchPageClient />
    </DashboardPageWrapper>
  );
}
