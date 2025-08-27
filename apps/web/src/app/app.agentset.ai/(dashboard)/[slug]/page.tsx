import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import DashboardPage from "./page.client";

export default function NamespacesPage() {
  return (
    <DashboardPageWrapper title="Dashboard">
      <DashboardPage />
    </DashboardPageWrapper>
  );
}
