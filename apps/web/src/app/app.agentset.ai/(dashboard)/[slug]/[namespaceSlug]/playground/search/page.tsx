import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import ChunkExplorerPageClient from "./page.client";

export default function SearchPage() {
  return (
    <DashboardPageWrapper title="Search" requireNamespace>
      <ChunkExplorerPageClient />
    </DashboardPageWrapper>
  );
}
