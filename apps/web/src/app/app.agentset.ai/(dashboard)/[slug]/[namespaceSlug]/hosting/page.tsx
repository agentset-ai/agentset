import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import HostingPageClient from "./page.client";

export default function HostingPage() {
  return (
    <DashboardPageWrapper title="Hosting" requireNamespace>
      <HostingPageClient />
    </DashboardPageWrapper>
  );
}
