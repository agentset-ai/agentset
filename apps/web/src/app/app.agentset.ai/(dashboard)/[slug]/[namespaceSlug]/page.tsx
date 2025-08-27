import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import NamespacePageClient from "./page.client";

export default function NamespacePage() {
  return (
    <DashboardPageWrapper title="Dashboard" requireNamespace>
      <NamespacePageClient />
    </DashboardPageWrapper>
  );
}
