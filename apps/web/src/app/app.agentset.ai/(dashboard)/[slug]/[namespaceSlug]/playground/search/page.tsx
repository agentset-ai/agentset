import Link from "next/link";
import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import { Tabs, TabsList, TabsTrigger } from "@agentset/ui";

import SearchPageClient from "./page.client";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ slug: string; namespaceSlug: string }>;
}) {
  const { slug, namespaceSlug } = await params;

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
