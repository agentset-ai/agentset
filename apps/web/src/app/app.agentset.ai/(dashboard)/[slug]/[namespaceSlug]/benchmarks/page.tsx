import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import BenchmarksPageClient from "./page.client";

export default function BenchmarksPage() {
  return (
    <DashboardPageWrapper title="Benchmarks" requireNamespace>
      <BenchmarksPageClient />
    </DashboardPageWrapper>
  );
}
