import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import ChunkExplorerPageClient from "./page.client";

export default function ChunkExplorerPage() {
  return (
    <DashboardPageWrapper title="Chunk Explorer" requireNamespace>
      <ChunkExplorerPageClient />
    </DashboardPageWrapper>
  );
}
